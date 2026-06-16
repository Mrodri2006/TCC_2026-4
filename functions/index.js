const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

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
    throw new functions.https.HttpsError("permission-denied", "Somente administradores podem executar esta aÃ§Ã£o.");
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
    throw new functions.https.HttpsError("invalid-argument", "Nome Ã© obrigatÃ³rio.");
  }
  if (!email || !email.includes("@")) {
    throw new functions.https.HttpsError("invalid-argument", "E-mail invÃ¡lido.");
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

const writeNotification = async (uid, { type, title, body, data }) => {
  const ref = db.collection("Usuario").doc(uid).collection("Notificacoes").doc();
  await ref.set({
    id: ref.id,
    type: type || "info",
    title: title || "",
    body: body || "",
    data: data || null,
    lida: false,
    criadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
};

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
    throw new functions.https.HttpsError("invalid-argument", "UID do usuÃ¡rio Ã© obrigatÃ³rio.");
  }

  const payload = normalizeAdminUserPayload(data?.usuario || data || {});
  if (callerUid === targetUid && payload.admin !== true) {
    throw new functions.https.HttpsError("failed-precondition", "VocÃª nÃ£o pode remover seu prÃ³prio acesso admin.");
  }

  const userRef = db.collection("Usuario").doc(targetUid);
  const currentSnap = await userRef.get();
  if (!currentSnap.exists) {
    throw new functions.https.HttpsError("not-found", "UsuÃ¡rio nÃ£o encontrado.");
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
    throw new functions.https.HttpsError("invalid-argument", "UID do usuÃ¡rio Ã© obrigatÃ³rio.");
  }
  if (callerUid === targetUid) {
    throw new functions.https.HttpsError("failed-precondition", "VocÃª nÃ£o pode apagar sua prÃ³pria conta admin.");
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
