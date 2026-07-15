const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const { normalizeServiceStatus, canTransitionService } = require("./serviceLifecycle");

admin.initializeApp();

const db = admin.firestore();

const GRACE_DAYS = 3;
const NOTIFY_DAYS_BEFORE = 5;

const getAccessToken = () => {
  const configToken = functions.config()?.mercadopago?.token;
  return process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || configToken || "";
};

const getWebhookSecret = () =>
  process.env.MP_WEBHOOK_SECRET || functions.config()?.mercadopago?.webhook_secret || "";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value.toDate) return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const addDays = (d, days) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
};

const lastDayOfMonth = (year, month0) => new Date(year, month0 + 1, 0).getDate();

// Regra: vence todo mês no dia do cadastro (ajusta para último dia do mês quando necessário)
const computeNextDueDate = (dataCadastro, fromDate = new Date()) => {
  const cadastro = startOfDay(dataCadastro);
  const from = startOfDay(fromDate);
  const day = cadastro.getDate();
  const y = from.getFullYear();
  const m = from.getMonth();

  const candidateDay = Math.min(day, lastDayOfMonth(y, m));
  const candidate = new Date(y, m, candidateDay);
  if (candidate <= from) {
    const nm = m + 1;
    const ny = y + Math.floor(nm / 12);
    const m0 = ((nm % 12) + 12) % 12;
    const d2 = Math.min(day, lastDayOfMonth(ny, m0));
    return new Date(ny, m0, d2);
  }
  return candidate;
};

const periodKeyFromDueDate = (dueDate) => {
  const y = dueDate.getFullYear();
  const m = String(dueDate.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const requireAuth = (context) => {
  if (!context?.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Usuário não autenticado.");
  }
  return context.auth.uid;
};

const ensurePrestador = async (uid) => {
  const userRef = db.collection("Usuario").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) throw new functions.https.HttpsError("not-found", "Usuário não encontrado.");
  const user = snap.data() || {};
  if (String(user.tipo || "").toLowerCase() !== "prestador") {
    throw new functions.https.HttpsError("failed-precondition", "Apenas prestadores possuem mensalidade.");
  }
  return { userRef, user };
};

const requireAdmin = async (context) => {
  const uid = requireAuth(context);
  const snap = await db.collection("Usuario").doc(uid).get();
  const user = snap.data() || {};
  const isAdmin = user.admin === true || String(user.tipo || "").toLowerCase() === "admin";
  if (!isAdmin) {
    throw new functions.https.HttpsError("permission-denied", "Somente administradores podem executar esta ação.");
  }
  return uid;
};

const sanitizeUserForAdmin = (doc) => {
  const data = doc.data() || {};
  const { senha, password, ...safeData } = data;
  return { id: doc.id, ...safeData };
};

const normalizeAdminUserPayload = (data = {}) => {
  const tipoRaw = String(data.tipo || "contratante").toLowerCase();
  const tipo = ["contratante", "prestador", "admin"].includes(tipoRaw) ? tipoRaw : "contratante";
  const adminFlag = Boolean(data.admin) || tipo === "admin";
  const nome = String(data.nome || "").trim();
  const email = String(data.email || "").trim().toLowerCase();

  if (!nome) {
    throw new functions.https.HttpsError("invalid-argument", "Nome é obrigatório.");
  }
  if (!email || !email.includes("@")) {
    throw new functions.https.HttpsError("invalid-argument", "E-mail inválido.");
  }

  return {
    nome,
    email,
    fone: String(data.fone || "").trim(),
    tipo: adminFlag ? "admin" : tipo,
    admin: adminFlag,
    profissao: !adminFlag && tipo === "prestador" ? String(data.profissao || "").trim() || null : null,
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  };
};

const mpFetch = async (path, { method = "GET", body, idempotencyKey } = {}) => {
  const token = getAccessToken();
  if (!token) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Access Token do Mercado Pago não configurado no backend."
    );
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`https://api.mercadopago.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.message || json?.error || "Erro Mercado Pago.";
    throw new functions.https.HttpsError("internal", message, json);
  }
  return json;
};

const createPixPayment = async ({
  amount,
  description,
  payerEmail,
  externalReference,
  idempotencyKey,
  notificationUrl,
}) => {
  const payload = {
    transaction_amount: amount,
    description,
    payment_method_id: "pix",
    payer: { email: payerEmail },
    external_reference: externalReference,
  };
  if (notificationUrl) payload.notification_url = notificationUrl;

  const dataResponse = await mpFetch("/v1/payments", {
    method: "POST",
    body: payload,
    idempotencyKey,
  });

  const transaction = dataResponse?.point_of_interaction?.transaction_data || {};
  return {
    mpPaymentId: String(dataResponse?.id || ""),
    mpStatus: String(dataResponse?.status || ""),
    qr_code_base64: transaction.qr_code_base64 || "",
    qr_code: transaction.qr_code || "",
    ticket_url: transaction.ticket_url || "",
    raw: dataResponse,
  };
};

const createCheckoutPreference = async ({
  title,
  amount,
  externalReference,
  payerEmail,
  idempotencyKey,
  notificationUrl,
}) => {
  const body = {
    items: [{ title, quantity: 1, unit_price: amount }],
    external_reference: externalReference,
    payer: payerEmail ? { email: payerEmail } : undefined,
    notification_url: notificationUrl || undefined,
  };
  const pref = await mpFetch("/checkout/preferences", { method: "POST", body, idempotencyKey });
  return {
    preferenceId: String(pref?.id || ""),
    init_point: pref?.init_point || "",
    sandbox_init_point: pref?.sandbox_init_point || "",
    raw: pref,
  };
};

const sendExpoPush = async (uid, { title, body, data }) => {
  const tokensSnap = await db.collection("Usuario").doc(uid).collection("PushTokens")
    .where("enabled", "==", true)
    .get();
  const messages = tokensSnap.docs
    .map((doc) => doc.data()?.token)
    .filter((token) => typeof token === "string" && token.startsWith("ExpoPushToken["))
    .map((token) => ({ to: token, sound: "default", title, body, data: data || {}, channelId: "default" }));

  if (!messages.length) return;
  for (let index = 0; index < messages.length; index += 100) {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages.slice(index, index + 100)),
    });
    if (!response.ok) console.error("Expo Push error", response.status, await response.text());
  }
};

const writeNotification = async (uid, { type, title, body, data }) => {
  const category = String(type || "").startsWith("service") ? "servicos"
    : String(type || "").startsWith("chat") ? "chat"
      : String(type || "").includes("payment") || String(type || "").includes("billing") ? "pagamentos" : "sistema";
  const priority = ["service_problem", "billing_blocked", "payment_failed"].includes(String(type || "")) ? "high" : "normal";
  const ref = db.collection("Usuario").doc(uid).collection("Notificacoes").doc();
  await ref.set({
    id: ref.id,
    type: type || "info",
    category,
    priority,
    title: title || "",
    body: body || "",
    data: data || null,
    lida: false,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
  await sendExpoPush(uid, { title, body, data }).catch((error) => console.error("Push notification error", error));
};

exports.obterAvaliacaoPrestador = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const prestadorId = String(data?.prestadorId || "");
  if (!prestadorId) {
    throw new functions.https.HttpsError("invalid-argument", "Prestador não informado.");
  }

  const providerSnapshot = await db.collection("Usuario").doc(prestadorId).get();
  const provider = providerSnapshot.data() || {};
  if (!providerSnapshot.exists || provider.tipo !== "prestador") {
    throw new functions.https.HttpsError("not-found", "Prestador não encontrado.");
  }

  const servicesSnapshot = await db.collection("ServicosAgendados").doc(prestadorId)
    .collection("ServicoStatus").where("avaliado", "==", true).get();
  const reviews = servicesSnapshot.docs.map((document) => {
    const service = document.data() || {};
    const rating = Number(service.avaliacaoNota);
    const reviewDate = toDate(service.avaliacaoData);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
    return {
      id: document.id,
      avaliacaoNota: rating,
      avaliacaoComentario: String(service.avaliacaoComentario || "").slice(0, 500),
      avaliacaoData: reviewDate ? reviewDate.getTime() : null,
      servico: String(service.estilo || service.tipo || "Serviço"),
    };
  }).filter(Boolean).sort((a, b) => Number(b.avaliacaoData || 0) - Number(a.avaliacaoData || 0));
  const ratings = reviews.map((review) => review.avaliacaoNota);

  if (!ratings.length) {
    return {
      avaliacao: Number(provider.avaliacao || 0),
      numeroAvaliacoes: Number(provider.numeroAvaliacoes || 0),
      avaliacoes: [],
    };
  }

  return {
    avaliacao: ratings.reduce((total, rating) => total + rating, 0) / ratings.length,
    numeroAvaliacoes: ratings.length,
    avaliacoes: reviews,
  };
});

const recordServiceTransition = async ({ eventId, prestadorId, servicoId, before, after }) => {
  const auditRef = db.collection("AuditLogs").doc(String(eventId));
  const providerRef = db.collection("Usuario").doc(prestadorId);
  await db.runTransaction(async (transaction) => {
    const [auditSnapshot, providerSnapshot] = await Promise.all([transaction.get(auditRef), transaction.get(providerRef)]);
    if (auditSnapshot.exists) return;
    const from = normalizeServiceStatus(before.status);
    const to = normalizeServiceStatus(after.status);
    const increments = {};
    if (to === "aceito" && from !== "aceito") increments.servicosAceitos = admin.firestore.FieldValue.increment(1);
    if (to === "rejeitado" && from !== "rejeitado") increments.servicosRejeitados = admin.firestore.FieldValue.increment(1);
    if (to === "cancelado" && from !== "cancelado") increments.servicosCancelados = admin.firestore.FieldValue.increment(1);
    if (to === "realizado" && from !== "realizado") increments.servicosConcluidos = admin.firestore.FieldValue.increment(1);
    if (to === "valor_pendente" && from !== "valor_pendente") {
      const requestedAt = toDate(after.dataSolicitacao || after.criadoEm);
      const proposedAt = toDate(after.dataPropostaValor) || new Date();
      if (requestedAt) {
        const minutes = Math.max(0, Math.round((proposedAt.getTime() - requestedAt.getTime()) / 60000));
        const provider = providerSnapshot.data() || {};
        const count = Number(provider.respostasContadas || 0) + 1;
        const total = Number(provider.tempoRespostaTotalMinutos || 0) + minutes;
        increments.respostasContadas = count;
        increments.tempoRespostaTotalMinutos = total;
        increments.tempoMedioRespostaMinutos = Math.round(total / count);
      }
    }
    if (Object.keys(increments).length) transaction.set(providerRef, increments, { merge: true });
    transaction.create(auditRef, {
      eventId, category: "service", action: "status_changed", prestadorId, servicoId,
      clienteId: after.clienteId || null, from, to, actorId: after.atualizadoPor || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
};

exports.onComplaintAnswered = functions.firestore.document("Denuncias/{complaintId}").onUpdate(async (change) => {
  const before = change.before.data() || {}; const after = change.after.data() || {};
  if (!after.reporterId || (before.status === after.status && before.respostaAdmin === after.respostaAdmin)) return null;
  await writeNotification(after.reporterId, { type: "complaint_update", title: "Atualização da denúncia", body: after.respostaAdmin || `Status atualizado para ${after.status || "em análise"}.`, data: { screen: "Notificacoes" } });
  return null;
});

exports.onChatMessageCreated = functions.firestore
  .document("Chats/{chatId}/Messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const message = snapshot.data() || {};
    const chatSnapshot = await db.collection("Chats").doc(context.params.chatId).get();
    const participants = Array.isArray(chatSnapshot.data()?.participants) ? chatSnapshot.data().participants : [];
    const senderId = String(message.senderId || "");
    if (!senderId) return;
    const senderSnapshot = await db.collection("Usuario").doc(senderId).get();
    const senderName = senderSnapshot.data()?.nome || "Nova mensagem";
    const recipients = participants.filter((uid) => uid !== senderId);
    await chatSnapshot.ref.set({ unreadFor: admin.firestore.FieldValue.arrayUnion(...recipients) }, { merge: true });
    await Promise.all(recipients.map((uid) => writeNotification(uid, {
      type: "chat_message",
      title: senderName,
      body: String(message.text || "Você recebeu uma nova mensagem").slice(0, 140),
      data: { screen: "Chat", params: { otherUserId: senderId, otherUserName: senderName } },
    })));
  });

const getChatParticipant = async (chatId, uid) => {
  const chatRef = db.collection("Chats").doc(chatId);
  const snapshot = await chatRef.get();
  if (!snapshot.exists || !(snapshot.data()?.participants || []).includes(uid)) throw new functions.https.HttpsError("permission-denied", "Você não participa desta conversa.");
  return chatRef;
};

exports.sendChatMessage = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context); const chatId = String(data?.chatId || ""); const recipientId = String(data?.recipientId || ""); const text = String(data?.text || "").trim().slice(0, 1000);
  if (!chatId || !recipientId || !text || chatId !== [uid, recipientId].sort().join("_")) throw new functions.https.HttpsError("invalid-argument", "Mensagem inválida.");
  const chatRef = db.collection("Chats").doc(chatId); const messageRef = chatRef.collection("Messages").doc(); const rateRef = db.collection("RateLimits").doc(`chat_${uid}`); const now = Date.now();
  const [myBlock, recipientBlock] = await Promise.all([db.collection("Usuario").doc(uid).collection("Bloqueados").doc(recipientId).get(), db.collection("Usuario").doc(recipientId).collection("Bloqueados").doc(uid).get()]);
  if (myBlock.exists || recipientBlock.exists) throw new functions.https.HttpsError("permission-denied", "A conversa está bloqueada.");
  await db.runTransaction(async (transaction) => {
    const [chatSnapshot, rateSnapshot] = await Promise.all([transaction.get(chatRef), transaction.get(rateRef)]); const participants = chatSnapshot.data()?.participants || [uid, recipientId].sort(); if (chatSnapshot.exists && (!participants.includes(uid) || !participants.includes(recipientId))) throw new functions.https.HttpsError("permission-denied", "Conversa inválida.");
    const rate = rateSnapshot.data() || {}; const windowStart = Number(rate.windowStart || 0); const count = now - windowStart < 10000 ? Number(rate.count || 0) + 1 : 1; if (count > 10) throw new functions.https.HttpsError("resource-exhausted", "Muitas mensagens em pouco tempo. Aguarde alguns segundos.");
    transaction.set(rateRef, { windowStart: count === 1 ? now : windowStart, count, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const message = { text, senderId: uid, createdAt: admin.firestore.FieldValue.serverTimestamp(), readBy: [uid], ...(data?.replyTo ? { replyTo: data.replyTo } : {}), ...(data?.attachment ? { attachment: data.attachment } : {}), ...(data?.location ? { location: data.location } : {}) };
    transaction.create(messageRef, message); transaction.set(chatRef, { participants: [uid, recipientId].sort(), lastMessage: text, lastMessageAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(), unreadFor: admin.firestore.FieldValue.arrayUnion(recipientId) }, { merge: true });
  });
  return { id: messageRef.id };
});

exports.editChatMessage = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context); const chatId = String(data?.chatId || ""); const messageId = String(data?.messageId || ""); const text = String(data?.text || "").trim().slice(0, 1000);
  if (!chatId || !messageId || !text) throw new functions.https.HttpsError("invalid-argument", "Mensagem inválida.");
  const ref = (await getChatParticipant(chatId, uid)).collection("Messages").doc(messageId);
  await db.runTransaction(async (transaction) => { const snapshot = await transaction.get(ref); const message = snapshot.data() || {}; if (!snapshot.exists || message.senderId !== uid || message.deletedAt) throw new functions.https.HttpsError("permission-denied", "Esta mensagem não pode ser editada."); const createdAt = toDate(message.createdAt); if (createdAt && Date.now() - createdAt.getTime() > 900000) throw new functions.https.HttpsError("failed-precondition", "O prazo de edição terminou."); transaction.update(ref, { text, editedAt: admin.firestore.FieldValue.serverTimestamp() }); });
  return { ok: true };
});

exports.deleteChatMessage = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context); const chatId = String(data?.chatId || ""); const messageId = String(data?.messageId || ""); const ref = (await getChatParticipant(chatId, uid)).collection("Messages").doc(messageId); const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.senderId !== uid) throw new functions.https.HttpsError("permission-denied", "Esta mensagem não pode ser apagada.");
  await ref.set({ text: "", deletedAt: admin.firestore.FieldValue.serverTimestamp(), deletedBy: uid }, { merge: true }); return { ok: true };
});

exports.reactToChatMessage = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context); const chatId = String(data?.chatId || ""); const messageId = String(data?.messageId || ""); const emoji = String(data?.emoji || "");
  if (!["👍", "❤️", "😂", "😮", "😢"].includes(emoji)) throw new functions.https.HttpsError("invalid-argument", "Reação inválida.");
  const ref = (await getChatParticipant(chatId, uid)).collection("Messages").doc(messageId); await ref.set({ [`reactions.${uid}`]: emoji }, { merge: true }); return { ok: true };
});

exports.markChatRead = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context); const chatId = String(data?.chatId || ""); const chatRef = await getChatParticipant(chatId, uid); const messages = await chatRef.collection("Messages").limit(100).get(); const batch = db.batch();
  messages.docs.forEach((document) => { const message = document.data() || {}; if (message.senderId !== uid && !(message.readBy || []).includes(uid)) batch.set(document.ref, { readBy: admin.firestore.FieldValue.arrayUnion(uid) }, { merge: true }); });
  batch.set(chatRef, { unreadFor: admin.firestore.FieldValue.arrayRemove(uid) }, { merge: true }); await batch.commit(); return { ok: true };
});

exports.revokeMySessions = functions.https.onCall(async (_data, context) => {
  const uid = requireAuth(context);
  await admin.auth().revokeRefreshTokens(uid);
  await db.collection("AuditLogs").add({ category: "security", action: "sessions_revoked", actorId: uid, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  return { ok: true };
});

const serviceStatusNotification = (status) => {
  const messages = {
    valor_pendente: ["Nova proposta", "O prestador enviou uma proposta de valor."],
    aceito: ["Serviço confirmado", "A proposta foi aceita e o serviço está confirmado."],
    realizado: ["Serviço finalizado", "O serviço foi marcado como concluído."],
    cancelado: ["Serviço cancelado", "O serviço foi cancelado."],
    rejeitado: ["Solicitação recusada", "O prestador não poderá atender esta solicitação."],
  };
  return messages[status] || null;
};

exports.onServicoAgendadoWritten = functions.firestore
  .document("ServicosAgendados/{prestadorId}/ServicoStatus/{servicoId}")
  .onWrite(async (change, context) => {
    if (!change.after.exists) return;
    const before = change.before.exists ? change.before.data() || {} : {};
    const after = change.after.data() || {};
    const status = String(after.status || "");
    if (change.before.exists && before.status === status) return;

    if (change.before.exists) {
      await recordServiceTransition({ eventId: context.eventId, prestadorId: context.params.prestadorId, servicoId: context.params.servicoId, before, after });
    }

    if (["cancelado", "rejeitado"].includes(status) && after.reservationKey) {
      await db.collection("Usuario").doc(context.params.prestadorId)
        .collection("ReservasAgenda").doc(String(after.reservationKey)).delete().catch(() => undefined);
    }

    if (!change.before.exists) {
      const clientSnapshot = after.clienteId
        ? await db.collection("Usuario").doc(String(after.clienteId)).get()
        : null;
      const clientName = clientSnapshot?.data()?.nome || after.nomeCliente || after.clienteNome || "Um contratante";
      await writeNotification(context.params.prestadorId, {
        type: "service_request",
        title: "Nova solicitação de serviço",
        body: `${clientName} solicitou ${after.estilo || after.tipo || "um serviço"}${after.local ? ` em ${after.local}` : ""}.`,
        data: { screen: "MenuTrabalhador" },
      });
      return;
    }

    const content = serviceStatusNotification(status);
    if (content && after.clienteId) {
      await writeNotification(after.clienteId, {
        type: `service_${status}`,
        title: content[0],
        body: content[1],
        data: { screen: "Home" },
      });
    }
  });

const parseBrazilianDate = (value) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value || ""));
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  if (date.getFullYear() !== Number(match[3]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[1])) return null;
  return date;
};

const DEFAULT_AVAILABILITY = [
  { enabled: false, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 0, slotDuration: 60 },
  { enabled: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 4, slotDuration: 60 },
  { enabled: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 4, slotDuration: 60 },
  { enabled: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 4, slotDuration: 60 },
  { enabled: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 4, slotDuration: 60 },
  { enabled: true, start: "08:00", end: "18:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 4, slotDuration: 60 },
  { enabled: false, start: "08:00", end: "13:00", lunchStart: "12:00", lunchEnd: "13:00", dailyLimit: 2, slotDuration: 60 },
];

const validClock = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));

const timeToMinutes = (value) => {
  if (!validClock(value)) return null;
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
};

const minutesToTime = (value) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

const normalizeAvailability = (snapshot, dayIndex) => {
  const base = DEFAULT_AVAILABILITY[dayIndex] || DEFAULT_AVAILABILITY[0];
  const data = snapshot?.exists ? snapshot.data() || {} : {};
  const slotDuration = Number(data.slotDuration || data.slotInterval || base.slotDuration);
  const dailyLimit = Number(data.dailyLimit ?? base.dailyLimit);
  return {
    enabled: data.enabled === undefined ? base.enabled : data.enabled === true,
    start: validClock(data.start) ? String(data.start) : base.start,
    end: validClock(data.end) ? String(data.end) : base.end,
    lunchStart: validClock(data.lunchStart) ? String(data.lunchStart) : base.lunchStart,
    lunchEnd: validClock(data.lunchEnd) ? String(data.lunchEnd) : base.lunchEnd,
    dailyLimit: Number.isFinite(dailyLimit) ? Math.max(0, Math.min(40, dailyLimit)) : base.dailyLimit,
    slotDuration: Number.isFinite(slotDuration) ? Math.max(15, Math.min(480, slotDuration)) : base.slotDuration,
  };
};

const dateToIso = (date) =>
  `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const isUnavailableDate = (unavailableSnapshot, isoDate) =>
  unavailableSnapshot.docs.some((document) => {
    const item = document.data() || {};
    return String(item.startDate || "") <= isoDate && String(item.endDate || "") >= isoDate;
  });

const buildScheduleSlots = (availability) => {
  if (!availability.enabled) return [];
  const start = timeToMinutes(availability.start);
  const end = timeToMinutes(availability.end);
  const lunchStart = timeToMinutes(availability.lunchStart);
  const lunchEnd = timeToMinutes(availability.lunchEnd);
  const slotDuration = Number(availability.slotDuration || 60);
  if (start === null || end === null || start >= end || !Number.isFinite(slotDuration) || slotDuration < 15) return [];

  const slots = [];
  for (let current = start; current + slotDuration <= end; current += slotDuration) {
    const crossesLunch = lunchStart !== null && lunchEnd !== null && lunchStart < lunchEnd && current < lunchEnd && current + slotDuration > lunchStart;
    if (!crossesLunch) slots.push(minutesToTime(current));
  }
  return slots;
};

exports.obterAgendaPrestador = functions.https.onCall(async (data, context) => {
  requireAuth(context);
  const prestadorId = String(data?.prestadorId || "");
  const dateText = String(data?.data || "").trim();
  const date = parseBrazilianDate(dateText);

  if (!prestadorId || !date) {
    throw new functions.https.HttpsError("invalid-argument", "Informe um prestador e uma data validos.");
  }

  const [providerSnapshot, availabilitySnapshot, unavailableSnapshot, reservationsSnapshot] = await Promise.all([
    db.collection("Usuario").doc(prestadorId).get(),
    db.collection("Usuario").doc(prestadorId).collection("Disponibilidade").doc(String(date.getDay())).get(),
    db.collection("Usuario").doc(prestadorId).collection("Indisponibilidades").get(),
    db.collection("Usuario").doc(prestadorId).collection("ReservasAgenda").where("data", "==", dateText).get(),
  ]);

  const provider = providerSnapshot.data() || {};
  if (!providerSnapshot.exists || provider.tipo !== "prestador" || provider.contaAtiva !== true || provider.assinaturaAtiva === false) {
    throw new functions.https.HttpsError("failed-precondition", "Este prestador nao esta disponivel para solicitacoes.");
  }

  const availability = normalizeAvailability(availabilitySnapshot, date.getDay());
  const isoDate = dateToIso(date);
  const reservedTimes = new Set(reservationsSnapshot.docs.map((document) => String(document.data()?.horario || "")));
  const baseSlots = buildScheduleSlots(availability);
  const blockedByDate = isUnavailableDate(unavailableSnapshot, isoDate);
  const dailyLimitReached = availability.dailyLimit > 0 && reservationsSnapshot.size >= availability.dailyLimit;

  return {
    data: dateText,
    enabled: availability.enabled && !blockedByDate,
    reason: !availability.enabled ? "fechado" : blockedByDate ? "indisponivel" : dailyLimitReached ? "limite" : null,
    start: availability.start,
    end: availability.end,
    lunchStart: availability.lunchStart,
    lunchEnd: availability.lunchEnd,
    dailyLimit: availability.dailyLimit,
    slotDuration: availability.slotDuration,
    totalReserved: reservationsSnapshot.size,
    slots: blockedByDate || !availability.enabled
      ? []
      : baseSlots.map((horario) => ({
          horario,
          status: reservedTimes.has(horario) ? "ocupado" : dailyLimitReached ? "limite" : "disponivel",
        })),
  };
});

exports.criarSolicitacaoServico = functions.https.onCall(async (data, context) => {
  const clienteId = requireAuth(context);
  const prestadorId = String(data?.prestadorId || "");
  const dateText = String(data?.data || "").trim();
  const horario = String(data?.horario || "").trim();
  const local = String(data?.local || "").trim();
  const descricao = String(data?.descricao || "").trim().slice(0, 1000);
  const tipo = String(data?.servico || "Serviço").trim().slice(0, 120);
  const date = parseBrazilianDate(dateText);

  if (!prestadorId || !local || !date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
    throw new functions.https.HttpsError("invalid-argument", "Informe uma data, horário e local válidos.");
  }
  if (startOfDay(date) < startOfDay(new Date())) {
    throw new functions.https.HttpsError("failed-precondition", "A data do serviço não pode estar no passado.");
  }

  const [providerSnapshot, clientSnapshot, availabilitySnapshot, unavailableSnapshot] = await Promise.all([
    db.collection("Usuario").doc(prestadorId).get(),
    db.collection("Usuario").doc(clienteId).get(),
    db.collection("Usuario").doc(prestadorId).collection("Disponibilidade").doc(String(date.getDay())).get(),
    db.collection("Usuario").doc(prestadorId).collection("Indisponibilidades").get(),
  ]);
  const provider = providerSnapshot.data() || {};
  if (!providerSnapshot.exists || provider.tipo !== "prestador" || provider.contaAtiva !== true || provider.assinaturaAtiva === false) {
    throw new functions.https.HttpsError("failed-precondition", "Este prestador não está disponível para solicitações.");
  }
  const normalizedAvailability = normalizeAvailability(availabilitySnapshot, date.getDay());
  const allowedSlots = buildScheduleSlots(normalizedAvailability);
  if (!normalizedAvailability.enabled || !allowedSlots.includes(horario)) {
    throw new functions.https.HttpsError("failed-precondition", "Escolha um horario disponivel na agenda do prestador.");
  }

  if (availabilitySnapshot.exists) {
    const availability = availabilitySnapshot.data() || {};
    if (availability.enabled !== true || horario < availability.start || horario >= availability.end) {
      throw new functions.https.HttpsError("failed-precondition", "O prestador não atende nesse dia ou horário.");
    }
  }

  const availability = availabilitySnapshot.data() || {};
  if (availability.lunchStart && availability.lunchEnd && horario >= availability.lunchStart && horario < availability.lunchEnd) {
    throw new functions.https.HttpsError("failed-precondition", "Este horário está reservado para o intervalo do prestador.");
  }
  const isoDate = `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (unavailableSnapshot.docs.some((document) => String(document.data()?.startDate || "") <= isoDate && String(document.data()?.endDate || "") >= isoDate)) {
    throw new functions.https.HttpsError("failed-precondition", "O prestador está indisponível nesta data.");
  }

  const serviceRef = db.collection("ServicosAgendados").doc(prestadorId).collection("ServicoStatus").doc();
  const clientServiceRef = db.collection("ServicosClientes").doc(clienteId).collection("ServicoStatus").doc(serviceRef.id);
  const reservationKey = `${dateText.replace(/\D/g, "")}_${horario.replace(":", "")}`;
  const reservationRef = db.collection("Usuario").doc(prestadorId).collection("ReservasAgenda").doc(reservationKey);
  const payload = {
    id: serviceRef.id,
    estilo: tipo,
    tipo,
    data: dateText,
    horario,
    local: local.slice(0, 300),
    descricao,
    status: "aguardando",
    clienteId,
    nomeCliente: clientSnapshot.data()?.nome || "Cliente",
    prestadorId,
    reservationKey,
    duracaoMinutos: normalizedAvailability.slotDuration,
    dataSolicitacao: admin.firestore.FieldValue.serverTimestamp(),
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.runTransaction(async (transaction) => {
    const dailyQuery = db.collection("Usuario").doc(prestadorId).collection("ReservasAgenda").where("data", "==", dateText);
    const [reservation, dailyReservations] = await Promise.all([transaction.get(reservationRef), transaction.get(dailyQuery)]);
    if (reservation.exists) {
      throw new functions.https.HttpsError("already-exists", "Este horário acabou de ser reservado. Escolha outro.");
    }
    const dailyLimit = Number(normalizedAvailability.dailyLimit || 0);
    if (dailyLimit > 0 && dailyReservations.size >= dailyLimit) {
      throw new functions.https.HttpsError("resource-exhausted", "O prestador atingiu o limite de serviços para esta data.");
    }
    transaction.create(reservationRef, {
      serviceId: serviceRef.id,
      clienteId,
      data: dateText,
      horario,
      tipo,
      duracaoMinutos: normalizedAvailability.slotDuration,
      status: "reservado",
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });
    transaction.create(serviceRef, payload);
    transaction.create(clientServiceRef, payload);
  });

  return { id: serviceRef.id };
});

// Cria uma proposta detalhada e sincroniza os dois históricos em uma única transação.
exports.enviarPropostaServico = functions.https.onCall(async (data, context) => {
  const prestadorId = requireAuth(context);
  const serviceId = String(data?.serviceId || "").trim();
  const clientId = String(data?.clientId || "").trim();
  const money = (value) => Number(Number(value || 0).toFixed(2));
  const laborAmount = money(data?.laborAmount);
  const materialsAmount = money(data?.materialsAmount);
  const travelFee = money(data?.travelFee);
  const discount = money(data?.discount);
  const deadlineDays = Number(data?.deadlineDays);
  const validityDays = Number(data?.validityDays);
  const notes = String(data?.notes || "").trim().slice(0, 1000);

  if (!serviceId || !clientId) {
    throw new functions.https.HttpsError("invalid-argument", "Serviço incompleto.");
  }
  if ([laborAmount, materialsAmount, travelFee, discount].some((value) => !Number.isFinite(value) || value < 0)) {
    throw new functions.https.HttpsError("invalid-argument", "Os valores da proposta devem ser números positivos.");
  }
  const subtotal = laborAmount + materialsAmount + travelFee;
  if (subtotal <= 0 || discount > subtotal) {
    throw new functions.https.HttpsError("invalid-argument", "Revise o total e o desconto da proposta.");
  }
  if (!Number.isInteger(deadlineDays) || deadlineDays < 1 || deadlineDays > 365 || !Number.isInteger(validityDays) || validityDays < 1 || validityDays > 90) {
    throw new functions.https.HttpsError("invalid-argument", "Informe prazo e validade válidos.");
  }

  const providerRef = db.collection("ServicosAgendados").doc(prestadorId).collection("ServicoStatus").doc(serviceId);
  const clientRef = db.collection("ServicosClientes").doc(clientId).collection("ServicoStatus").doc(serviceId);
  const proposalRef = providerRef.collection("Propostas").doc();
  const clientProposalRef = clientRef.collection("Propostas").doc(proposalRef.id);
  const validUntil = admin.firestore.Timestamp.fromMillis(Date.now() + validityDays * 86400000);
  const totalAmount = money(subtotal - discount);
  let version = 1;

  await db.runTransaction(async (transaction) => {
    const [providerSnapshot, clientSnapshot] = await Promise.all([transaction.get(providerRef), transaction.get(clientRef)]);
    const service = providerSnapshot.data() || {};
    if (!providerSnapshot.exists || !clientSnapshot.exists || service.prestadorId !== prestadorId || service.clienteId !== clientId) {
      throw new functions.https.HttpsError("permission-denied", "Esta solicitação não pertence ao prestador autenticado.");
    }
    const currentStatus = normalizeServiceStatus(service.status);
    if (!["aguardando", "valor_pendente"].includes(currentStatus)) {
      throw new functions.https.HttpsError("failed-precondition", "Não é possível enviar proposta neste estágio do serviço.");
    }
    version = Number(service.proposalVersion || 0) + 1;
    const proposal = {
      laborAmount, materialsAmount, travelFee, discount, totalAmount, deadlineDays, validUntil, notes,
      version, status: "pending", createdBy: prestadorId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const timelineEvent = {
      status: "valor_pendente", actor: "prestador", actorId: prestadorId,
      note: `Proposta ${version} enviada`, at: admin.firestore.Timestamp.now(),
    };
    const update = {
      status: "valor_pendente", valor: totalAmount, valorProposto: totalAmount,
      currentProposal: proposal, proposalVersion: version,
      timeline: admin.firestore.FieldValue.arrayUnion(timelineEvent),
      dataPropostaValor: admin.firestore.FieldValue.serverTimestamp(),
      dataAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
    transaction.create(proposalRef, proposal);
    transaction.create(clientProposalRef, proposal);
    transaction.set(providerRef, update, { merge: true });
    transaction.set(clientRef, update, { merge: true });
  });

  return { ok: true, totalAmount, version };
});

exports.responderPropostaServico = functions.https.onCall(async (data, context) => {
  const clientId = requireAuth(context);
  const providerId = String(data?.providerId || "").trim();
  const serviceId = String(data?.serviceId || "").trim();
  const action = String(data?.action || "");
  const message = String(data?.message || "").trim().slice(0, 1000);
  if (!providerId || !serviceId || !["accept", "reject", "request_change"].includes(action)) {
    throw new functions.https.HttpsError("invalid-argument", "Resposta de proposta inválida.");
  }
  if (action === "request_change" && !message) {
    throw new functions.https.HttpsError("invalid-argument", "Explique o que precisa ser alterado.");
  }

  const providerRef = db.collection("ServicosAgendados").doc(providerId).collection("ServicoStatus").doc(serviceId);
  const clientRef = db.collection("ServicosClientes").doc(clientId).collection("ServicoStatus").doc(serviceId);
  let nextStatus = "valor_pendente";
  await db.runTransaction(async (transaction) => {
    const [providerSnapshot, clientSnapshot] = await Promise.all([transaction.get(providerRef), transaction.get(clientRef)]);
    const service = providerSnapshot.data() || {};
    if (!providerSnapshot.exists || !clientSnapshot.exists || service.clienteId !== clientId || service.prestadorId !== providerId) {
      throw new functions.https.HttpsError("permission-denied", "Esta proposta não pertence ao contratante autenticado.");
    }
    if (normalizeServiceStatus(service.status) !== "valor_pendente" || !service.currentProposal) {
      throw new functions.https.HttpsError("failed-precondition", "Esta proposta não está mais disponível.");
    }
    nextStatus = action === "accept" ? "aceito" : action === "reject" ? "rejeitado" : "valor_pendente";
    const proposalStatus = action === "accept" ? "accepted" : action === "reject" ? "rejected" : "change_requested";
    const event = {
      status: nextStatus, actor: "contratante", actorId: clientId, note: message || proposalStatus,
      at: admin.firestore.Timestamp.now(),
    };
    const update = {
      status: nextStatus, valorAceito: action === "accept",
      currentProposal: { ...service.currentProposal, status: proposalStatus, responseMessage: message, respondedAt: admin.firestore.Timestamp.now() },
      negotiationHistory: admin.firestore.FieldValue.arrayUnion({ action, message, actorId: clientId, at: admin.firestore.Timestamp.now(), version: Number(service.proposalVersion || 1) }),
      timeline: admin.firestore.FieldValue.arrayUnion(event),
      dataRespostaValor: admin.firestore.FieldValue.serverTimestamp(),
      dataAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
    transaction.set(providerRef, update, { merge: true });
    transaction.set(clientRef, update, { merge: true });
  });
  return { ok: true, status: nextStatus };
});

exports.enviarAvaliacaoServico = functions.https.onCall(async (data, context) => {
  const clienteId = requireAuth(context);
  const prestadorId = String(data?.prestadorId || "");
  const servicoId = String(data?.servicoId || "");
  const nota = Number(data?.nota);
  const comentario = String(data?.comentario || "").trim().slice(0, 500);
  if (!prestadorId || !servicoId || !Number.isInteger(nota) || nota < 1 || nota > 5) {
    throw new functions.https.HttpsError("invalid-argument", "Avaliação inválida.");
  }

  const providerServiceRef = db.collection("ServicosAgendados").doc(prestadorId).collection("ServicoStatus").doc(servicoId);
  const clientServiceRef = db.collection("ServicosClientes").doc(clienteId).collection("ServicoStatus").doc(servicoId);
  const providerRef = db.collection("Usuario").doc(prestadorId);
  const publicReviewRef = providerRef.collection("Avaliacoes").doc(servicoId);

  await db.runTransaction(async (transaction) => {
    const serviceSnapshot = await transaction.get(providerServiceRef);
    const clientServiceSnapshot = await transaction.get(clientServiceRef);
    const providerSnapshot = await transaction.get(providerRef);
    const service = serviceSnapshot.data() || {};
    if (!serviceSnapshot.exists || !clientServiceSnapshot.exists || service.clienteId !== clienteId) {
      throw new functions.https.HttpsError("permission-denied", "Este serviço não pertence ao contratante autenticado.");
    }
    if (service.status !== "realizado") {
      throw new functions.https.HttpsError("failed-precondition", "A avaliação só é liberada após a conclusão do serviço.");
    }
    if (service.avaliado === true) {
      throw new functions.https.HttpsError("already-exists", "Este serviço já foi avaliado.");
    }

    const provider = providerSnapshot.data() || {};
    const previousCount = Number(provider.numeroAvaliacoes || 0);
    const storedSum = Number(provider.avaliacaoSoma);
    const previousSum = Number.isFinite(storedSum)
      ? storedSum
      : Number(provider.avaliacao || 0) * previousCount;
    const count = previousCount + 1;
    const sum = previousSum + nota;
    const review = {
      avaliacaoNota: nota,
      avaliacaoComentario: comentario,
      avaliacaoData: admin.firestore.FieldValue.serverTimestamp(),
      avaliacaoLiberada: false,
      avaliado: true,
    };
    transaction.set(providerServiceRef, review, { merge: true });
    transaction.set(clientServiceRef, review, { merge: true });
    transaction.set(publicReviewRef, {
      avaliacaoNota: nota,
      avaliacaoComentario: comentario,
      avaliacaoData: admin.firestore.FieldValue.serverTimestamp(),
      servicoId,
    });
    transaction.set(providerRef, { avaliacaoSoma: sum, numeroAvaliacoes: count, avaliacao: sum / count }, { merge: true });
  });

  await writeNotification(prestadorId, {
    type: "service_review",
    title: "Nova avaliação recebida",
    body: `Você recebeu uma avaliação de ${nota} estrela${nota === 1 ? "" : "s"}.`,
    data: { screen: "PerfilTrabalhador" },
  });
  return { ok: true };
});

exports.atualizarStatusServico = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const prestadorId = String(data?.prestadorId || "");
  const clienteId = String(data?.clienteId || "");
  const servicoId = String(data?.servicoId || "");
  const nextStatus = normalizeServiceStatus(data?.status);
  if (!prestadorId || !clienteId || !servicoId) {
    throw new functions.https.HttpsError("invalid-argument", "Serviço incompleto.");
  }
  const callerSnapshot = await db.collection("Usuario").doc(uid).get();
  const caller = callerSnapshot.data() || {};
  const callerIsAdmin = caller.admin === true || caller.tipo === "admin";

  const providerRef = db.collection("ServicosAgendados").doc(prestadorId).collection("ServicoStatus").doc(servicoId);
  const clientRef = db.collection("ServicosClientes").doc(clienteId).collection("ServicoStatus").doc(servicoId);
  await db.runTransaction(async (transaction) => {
    const [providerSnapshot, clientSnapshot] = await Promise.all([
      transaction.get(providerRef),
      transaction.get(clientRef),
    ]);
    if (!providerSnapshot.exists && !clientSnapshot.exists) {
      throw new functions.https.HttpsError("not-found", "Serviço não encontrado.");
    }

    const service = (providerSnapshot.exists ? providerSnapshot.data() : clientSnapshot.data()) || {};
    const resolvedPrestadorId = String(service.prestadorId || prestadorId);
    const resolvedClienteId = String(service.clienteId || clienteId);
    if (resolvedPrestadorId !== prestadorId || resolvedClienteId !== clienteId) {
      throw new functions.https.HttpsError("permission-denied", "Este serviço não pertence aos participantes informados.");
    }

    const actor = callerIsAdmin ? "admin" : uid === resolvedPrestadorId ? "prestador" : uid === resolvedClienteId ? "contratante" : "";
    if (!actor) throw new functions.https.HttpsError("permission-denied", "Você não participa deste serviço.");

    if (!canTransitionService(service.status, nextStatus, actor)) {
      throw new functions.https.HttpsError("failed-precondition", "Esta mudança de status não é permitida.");
    }
    const update = {
      ...service,
      id: service.id || servicoId,
      prestadorId: resolvedPrestadorId,
      clienteId: resolvedClienteId,
      status: nextStatus,
      dataAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoPor: uid,
      timeline: admin.firestore.FieldValue.arrayUnion({
        status: nextStatus,
        actor,
        actorId: uid,
        at: admin.firestore.Timestamp.now(),
      }),
      ...(nextStatus === "realizado"
        ? { dataFinalizado: admin.firestore.FieldValue.serverTimestamp(), avaliacaoLiberada: true }
        : {}),
    };
    transaction.set(providerRef, update, { merge: true });
    transaction.set(clientRef, update, { merge: true });
  });
  return { status: nextStatus };
});

const setActiveAfterPayment = async (uid, paidAt, nextDueDate, amount) => {
  const userRef = db.collection("Usuario").doc(uid);
  await userRef.set(
    {
      assinaturaAtiva: true,
      contaAtiva: true,
      statusPagamento: "pago",
      ultimoPagamento: paidAt,
      dataVencimento: nextDueDate,
      valorMensalidade: amount,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

// 1) Inicializa billing automaticamente no cadastro do prestador
exports.onUsuarioCreateInitBilling = functions.firestore.document("Usuario/{uid}").onCreate(async (snap, context) => {
  const uid = context.params.uid;
  const data = snap.data() || {};
  if (String(data.tipo || "").toLowerCase() !== "prestador") return;

  const criadoEm = toDate(data.criadoEm) || new Date();
  const dataCadastro = startOfDay(criadoEm);
  const defaultAmount = Number(process.env.MENSALIDADE_VALOR || 29.9);

  await snap.ref.set(
    {
      dataCadastro,
      dataVencimento: data.dataVencimento || dataCadastro,
      assinaturaAtiva: data.assinaturaAtiva === true,
      contaAtiva: data.contaAtiva === true,
      ultimoPagamento: null,
      statusPagamento: data.statusPagamento || "primeiro_pagamento_pendente",
      valorMensalidade: Number(data.valorMensalidade || (Number.isFinite(defaultAmount) ? defaultAmount : 29.9)),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
});

// 4) Gera cobrança (PIX e/ou link) e grava no Firestore
exports.createMensalidade = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const { userRef, user } = await ensurePrestador(uid);

  const payerEmail = context.auth.token?.email || user.email || null;
  if (!payerEmail) throw new functions.https.HttpsError("failed-precondition", "E-mail do pagador não encontrado.");

  const amount = Number(user.valorMensalidade || process.env.MENSALIDADE_VALOR || 29.9);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new functions.https.HttpsError("failed-precondition", "Valor de mensalidade inválido.");
  }

  const dataCadastro = toDate(user.dataCadastro) || toDate(user.criadoEm) || new Date();
  const currentDue = toDate(user.dataVencimento) || computeNextDueDate(startOfDay(dataCadastro), new Date());
  const periodKey = periodKeyFromDueDate(currentDue);

  const invoiceRef = userRef.collection("Mensalidades").doc(periodKey);
  const mode = String(data?.mode || "pix"); // pix | checkout | both
  const force = Boolean(data?.forceNew || false);

  const existing = await invoiceRef.get();
  if (existing.exists && !force) {
    const inv = existing.data() || {};
    return { invoiceId: invoiceRef.id, ...inv };
  }

  const dueDate = startOfDay(currentDue);
  const graceUntil = addDays(dueDate, GRACE_DAYS);
  const externalReference = `${uid}|${periodKey}`;

  const invoiceData = {
    id: invoiceRef.id,
    uid,
    periodKey,
    amount,
    dueDate,
    graceUntil,
    status: "pending",
    mpPaymentId: null,
    mpStatus: null,
    externalReference,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    paidAt: null,
  };

  await invoiceRef.set(invoiceData, { merge: true });

  const idempotencyKey = `invoice_${uid}_${periodKey}`;
  const description = `Mensalidade (${periodKey})`;
  const notificationUrl = process.env.MP_NOTIFICATION_URL || null;

  const result = { ...invoiceData };

  if (mode === "pix" || mode === "both") {
    const pix = await createPixPayment({
      amount,
      description,
      payerEmail,
      externalReference,
      idempotencyKey,
      notificationUrl,
    });
    result.pix = { qr_code_base64: pix.qr_code_base64, qr_code: pix.qr_code, ticket_url: pix.ticket_url };
    result.mpPaymentId = pix.mpPaymentId || null;
    result.mpStatus = pix.mpStatus || null;
  }

  if (mode === "checkout" || mode === "both") {
    const pref = await createCheckoutPreference({
      title: description,
      amount,
      externalReference,
      payerEmail,
      idempotencyKey,
      notificationUrl,
    });
    result.checkout = { init_point: pref.init_point, preferenceId: pref.preferenceId };
  }

  await invoiceRef.set(
    {
      ...("pix" in result ? { pix: result.pix } : {}),
      ...("checkout" in result ? { checkout: result.checkout } : {}),
      mpPaymentId: result.mpPaymentId,
      mpStatus: result.mpStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return result;
});

// 7) Ao abrir o app: consulta status no backend (fonte de verdade)
exports.getMensalidadeStatus = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const { userRef, user } = await ensurePrestador(uid);

  const dataCadastro = toDate(user.dataCadastro) || toDate(user.criadoEm) || null;
  const dataVencimento = toDate(user.dataVencimento) || null;

  let invoice = null;
  if (dataVencimento) {
    const periodKey = periodKeyFromDueDate(dataVencimento);
    const snap = await userRef.collection("Mensalidades").doc(periodKey).get();
    invoice = snap.exists ? snap.data() : null;
  }

  return {
    assinaturaAtiva: !!user.assinaturaAtiva,
    contaAtiva: !!user.contaAtiva,
    statusPagamento: user.statusPagamento || null,
    valorMensalidade: user.valorMensalidade || null,
    dataCadastro,
    dataVencimento,
    ultimoPagamento: toDate(user.ultimoPagamento) || null,
    invoice,
  };
});

exports.adminListUsuarios = functions.https.onCall(async (_data, context) => {
  await requireAdmin(context);

  const snap = await db.collection("Usuario").get();
  return snap.docs.map(sanitizeUserForAdmin).sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")));
});

exports.adminUpdateUsuario = functions.https.onCall(async (data, context) => {
  const callerUid = await requireAdmin(context);
  const targetUid = String(data?.uid || "");
  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "UID do usuário é obrigatório.");
  }

  const payload = normalizeAdminUserPayload(data?.usuario || data || {});
  if (callerUid === targetUid && payload.admin !== true) {
    throw new functions.https.HttpsError("failed-precondition", "Você não pode remover seu próprio acesso admin.");
  }

  const userRef = db.collection("Usuario").doc(targetUid);
  const currentSnap = await userRef.get();
  if (!currentSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Usuário não encontrado.");
  }

  try {
    await admin.auth().updateUser(targetUid, {
      email: payload.email,
      displayName: payload.nome,
    });
  } catch (err) {
    if (err?.code !== "auth/user-not-found") {
      throw err;
    }
  }

  await userRef.set(payload, { merge: true });
  const updated = await userRef.get();
  return sanitizeUserForAdmin(updated);
});

exports.adminDeleteUsuario = functions.https.onCall(async (data, context) => {
  const callerUid = await requireAdmin(context);
  const targetUid = String(data?.uid || "");
  if (!targetUid) {
    throw new functions.https.HttpsError("invalid-argument", "UID do usuário é obrigatório.");
  }
  if (callerUid === targetUid) {
    throw new functions.https.HttpsError("failed-precondition", "Você não pode apagar sua própria conta admin.");
  }

  await db.collection("Usuario").doc(targetUid).delete();
  try {
    await admin.auth().deleteUser(targetUid);
  } catch (err) {
    if (err?.code !== "auth/user-not-found") {
      throw err;
    }
  }

  return { ok: true };
});

const parseMercadoPagoWebhookBody = (req) => {
  const body = req.body || {};
  const query = req.query || {};
  const dataId = body?.data?.id || query["data.id"] || query.id || null;
  return { dataId: dataId ? String(dataId) : null, raw: body };
};

// Defesa extra: se tiver segredo configurado, tenta validar headers (se não tiver, segue e valida consultando o MP)
const verifyWebhookSignatureIfPossible = (req) => {
  const secret = getWebhookSecret();
  if (!secret) return { ok: true, skipped: true };

  const sig = String(req.header("x-signature") || "");
  const requestId = String(req.header("x-request-id") || "");
  const ts = String(req.header("x-signature-ts") || req.query?.ts || "");
  if (!sig || !requestId || !ts) return { ok: false, reason: "missing_signature_headers" };

  const base = `ts:${ts};request-id:${requestId}`;
  const computed = crypto.createHmac("sha256", secret).update(base).digest("hex");
  if (computed.length !== sig.length) return { ok: false, reason: "invalid_signature" };
  const ok = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sig));
  return { ok, skipped: false, reason: ok ? null : "invalid_signature" };
};

// 4) Webhook MP: confirma no MP e atualiza Firestore
exports.mercadoPagoWebhook = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const verification = verifyWebhookSignatureIfPossible(req);
    if (!verification.ok) {
      await db.collection("MercadoPagoWebhooks").add({
        ok: false,
        reason: verification.reason,
        headers: req.headers || {},
        body: req.body || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(401).send("Unauthorized");
    }

    const { dataId, raw } = parseMercadoPagoWebhookBody(req);
    await db.collection("MercadoPagoWebhooks").add({
      ok: true,
      dataId: dataId || null,
      headers: req.headers || {},
      body: raw || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (!dataId) return res.status(200).send("ok");

    // Fonte de verdade anti-fraude: consulta o pagamento pelo id no MP
    const payment = await mpFetch(`/v1/payments/${dataId}`, { method: "GET" });
    const status = String(payment?.status || "");
    const amount = Number(payment?.transaction_amount || 0);
    const externalReference = String(payment?.external_reference || "");

    const [uid, periodKey] = externalReference.split("|");
    if (!uid || !periodKey) return res.status(200).send("ok");

    const userRef = db.collection("Usuario").doc(uid);
    const invoiceRef = userRef.collection("Mensalidades").doc(periodKey);
    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) return res.status(200).send("ok");
    const invoice = invoiceSnap.data() || {};

    // Anti-fraude: valor deve bater com o esperado
    if (Number(invoice.amount || 0) !== amount) {
      await invoiceRef.set(
        {
          mpPaymentId: String(payment.id),
          mpStatus: status,
          fraudFlag: "amount_mismatch",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return res.status(200).send("ok");
    }

    if (status === "approved") {
      const paidAt = payment?.date_approved ? new Date(payment.date_approved) : new Date();
      const userSnap = await userRef.get();
      const user = userSnap.data() || {};
      const nextDue = computeNextDueDate(startOfDay(paidAt), paidAt);

      await invoiceRef.set(
        {
          status: "paid",
          mpPaymentId: String(payment.id),
          mpStatus: status,
          paidAt,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await setActiveAfterPayment(uid, paidAt, nextDue, amount);

      await writeNotification(uid, {
        type: "billing_paid",
        title: "Pagamento confirmado",
        body: "Seu pagamento foi confirmado e sua conta foi reativada.",
        data: { periodKey },
      });
    } else {
      await invoiceRef.set(
        { mpPaymentId: String(payment.id), mpStatus: status, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Webhook error", err);
    return res.status(500).send("error");
  }
});

// 9 + 13 + 14) Verificação diária: tolerância, bloqueio e notificações
exports.checkMensalidadesDaily = functions.pubsub
  .schedule("every day 02:00")
  .timeZone("America/Sao_Paulo")
  .onRun(async () => {
    const today = startOfDay(new Date());
    const prestadoresSnap = await db.collection("Usuario").where("tipo", "==", "prestador").get();
    const batch = db.batch();

    for (const doc of prestadoresSnap.docs) {
      const uid = doc.id;
      const data = doc.data() || {};
      const dataCadastro = toDate(data.dataCadastro) || toDate(data.criadoEm);
      if (!dataCadastro) continue;

      const dueDate = toDate(data.dataVencimento) || computeNextDueDate(startOfDay(dataCadastro), today);
      const dueStart = startOfDay(dueDate);
      const graceUntil = addDays(dueStart, GRACE_DAYS);
      const periodKey = periodKeyFromDueDate(dueStart);

      const invoiceRef = doc.ref.collection("Mensalidades").doc(periodKey);
      const invoiceSnap = await invoiceRef.get();
      const invoice = invoiceSnap.exists ? invoiceSnap.data() : null;
      const paid = invoice?.status === "paid";

      const notify5Before = startOfDay(addDays(dueStart, -NOTIFY_DAYS_BEFORE)).getTime() === today.getTime();
      const notifyOnDue = dueStart.getTime() === today.getTime();

      if (notify5Before) {
        await writeNotification(uid, {
          type: "billing_due_soon",
          title: "Mensalidade vence em 5 dias",
          body: "Evite bloqueio: pague sua mensalidade antes do vencimento.",
          data: { dueDate: dueStart },
        });
      }
      if (notifyOnDue) {
        await writeNotification(uid, {
          type: "billing_due_today",
          title: "Mensalidade vence hoje",
          body: "Realize o pagamento para continuar usando a plataforma sem interrupções.",
          data: { dueDate: dueStart },
        });
      }

      if (!paid && today > graceUntil) {
        batch.set(
          doc.ref,
          {
            assinaturaAtiva: false,
            contaAtiva: false,
            statusPagamento: "inadimplente",
            atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        batch.set(
          invoiceRef,
          {
            id: periodKey,
            uid,
            periodKey,
            amount: Number(data.valorMensalidade || process.env.MENSALIDADE_VALOR || 29.9),
            dueDate: dueStart,
            graceUntil,
            status: "blocked",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        await writeNotification(uid, {
          type: "billing_blocked",
          title: "Conta bloqueada",
          body: "Sua conta foi bloqueada após 3 dias de tolerância sem pagamento.",
          data: { dueDate: dueStart },
        });
      } else if (!paid && today > dueStart && today <= graceUntil) {
        batch.set(
          doc.ref,
          { statusPagamento: "em_atraso_tolerancia", atualizadoEm: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
        batch.set(
          invoiceRef,
          {
            id: periodKey,
            uid,
            periodKey,
            amount: Number(data.valorMensalidade || process.env.MENSALIDADE_VALOR || 29.9),
            dueDate: dueStart,
            graceUntil,
            status: "overdue",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } else if (paid) {
        batch.set(
          doc.ref,
          {
            statusPagamento: "em_dia",
            assinaturaAtiva: true,
            contaAtiva: true,
            atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    await batch.commit();
    return null;
  });

// Compatibilidade: chamada antiga (gera apenas PIX, sem invoice)
exports.gerarPixMensalidade = functions.https.onCall(async (data, context) => {
  const uid = requireAuth(context);
  const amount = Number(data?.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new functions.https.HttpsError("invalid-argument", "Valor inválido.");
  const description = String(data?.description || "Mensalidade");
  const idempotencyKey = String(data?.idempotencyKey || `pix_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  const emailPagador = context.auth.token?.email;
  if (!emailPagador) throw new functions.https.HttpsError("failed-precondition", "E-mail do pagador não encontrado.");

  const pix = await createPixPayment({
    amount,
    description,
    payerEmail: emailPagador,
    externalReference: `${uid}|manual`,
    idempotencyKey,
    notificationUrl: process.env.MP_NOTIFICATION_URL || null,
  });

  return { qr_code_base64: pix.qr_code_base64, qr_code: pix.qr_code, ticket_url: pix.ticket_url };
});

// Lista meios de pagamento disponíveis (GET /v1/payment_methods)
exports.getPaymentMethods = functions.https.onCall(async (data, context) => {
  requireAuth(context);

  const includeAll = Boolean(data?.includeAll);
  const methods = await mpFetch("/v1/payment_methods");

  const mapped = Array.isArray(methods)
    ? methods.map((m) => ({
        id: String(m?.id || ""),
        name: String(m?.name || ""),
        payment_type_id: String(m?.payment_type_id || ""),
        status: String(m?.status || ""),
      }))
    : [];

  return includeAll ? mapped : mapped.filter((m) => m.status === "active");
});

// Busca meios de pagamento por BIN (equivalente ao coreMethods.getPaymentMethods(bin))
exports.getPaymentMethodsByBin = functions.https.onCall(async (data, context) => {
  requireAuth(context);

  const binRaw = String(data?.bin || "").replace(/\D/g, "");
  if (binRaw.length < 6 || binRaw.length > 9) {
    throw new functions.https.HttpsError("invalid-argument", "BIN inválido. Informe entre 6 e 9 dígitos.");
  }

  const res = await mpFetch(`/v1/payment_methods/search?bin=${encodeURIComponent(binRaw)}`);
  const methods = Array.isArray(res?.results) ? res.results : [];

  return methods.map((m) => ({
    id: String(m?.id || ""),
    name: String(m?.name || ""),
    payment_type_id: String(m?.payment_type_id || ""),
    status: String(m?.status || ""),
  }));
});

// Busca condições de parcelamento (equivalente ao coreMethods.getInstallments)
// API: GET /v1/payment_methods/installments?amount=...&bin=...&payment_method_id=...
exports.getInstallments = functions.https.onCall(async (data, context) => {
  requireAuth(context);

  const bin = String(data?.bin || "").replace(/\D/g, "");
  if (bin.length < 6 || bin.length > 9) {
    throw new functions.https.HttpsError("invalid-argument", "BIN inválido. Informe entre 6 e 9 dígitos.");
  }

  const amount = Number(data?.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Valor inválido. Informe um amount > 0.");
  }

  const paymentMethodId = data?.paymentMethodId ? String(data.paymentMethodId) : "";
  const qs = new URLSearchParams({
    bin,
    amount: String(amount),
    ...(paymentMethodId ? { payment_method_id: paymentMethodId } : {}),
  }).toString();

  const res = await mpFetch(`/v1/payment_methods/installments?${qs}`);
  return res;
});

// Tipos de documento (equivalente ao coreMethods.getIdentificationTypes)
exports.getIdentificationTypes = functions.https.onCall(async (_data, context) => {
  requireAuth(context);
  const res = await mpFetch("/v1/identification_types");
  return res;
});

// Emissores do cartão (equivalente ao coreMethods.getCardIssuers)
// API: GET /v1/payment_methods/card_issuers?payment_method_id=...&bin=...
exports.getCardIssuers = functions.https.onCall(async (data, context) => {
  requireAuth(context);

  const bin = String(data?.bin || "").replace(/\D/g, "");
  if (bin.length < 6 || bin.length > 9) {
    throw new functions.https.HttpsError("invalid-argument", "BIN inválido. Informe entre 6 e 9 dígitos.");
  }
  const paymentMethodId = String(data?.paymentMethodId || "");
  if (!paymentMethodId) {
    throw new functions.https.HttpsError("invalid-argument", "paymentMethodId é obrigatório.");
  }

  const qs = new URLSearchParams({ bin, payment_method_id: paymentMethodId }).toString();
  const res = await mpFetch(`/v1/payment_methods/card_issuers?${qs}`);
  return res;
});

// Realizar pagamento via Orders (server-side) - requer `token` gerado no client-side
// API: POST /v1/orders
exports.createOrder = functions.https.onCall(async (data, context) => {
  requireAuth(context);

  const totalAmount = Number(data?.totalAmount || data?.total_amount || 0);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "totalAmount inválido.");
  }

  const paymentMethodId = String(data?.paymentMethodId || data?.payment_method_id || "");
  const paymentType = String(data?.paymentType || data?.payment_type || "credit_card");
  const token = String(data?.token || "");
  const installments = Number(data?.installments || 1);

  if (!paymentMethodId) throw new functions.https.HttpsError("invalid-argument", "paymentMethodId é obrigatório.");
  if (!token) throw new functions.https.HttpsError("invalid-argument", "token é obrigatório (card token).");
  if (!Number.isFinite(installments) || installments <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "installments inválido.");
  }

  const externalReference = String(data?.externalReference || data?.external_reference || "");
  const payerEmail = String(data?.payerEmail || data?.payer?.email || context.auth.token?.email || "");
  if (!payerEmail) throw new functions.https.HttpsError("failed-precondition", "E-mail do pagador não encontrado.");

  const idempotencyKey = String(
    data?.idempotencyKey || data?.idempotency_key || `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );

  const body = {
    type: "online",
    processing_mode: "automatic",
    total_amount: Number(totalAmount.toFixed(2)),
    ...(externalReference ? { external_reference: externalReference } : {}),
    payer: { email: payerEmail },
    transactions: {
      payments: [
        {
          amount: Number(totalAmount.toFixed(2)),
          payment_method: {
            id: paymentMethodId,
            type: paymentType,
            token,
            installments: Number(installments),
          },
        },
      ],
    },
  };

  const res = await mpFetch("/v1/orders", { method: "POST", body, idempotencyKey });
  return res;
});
