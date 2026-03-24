const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const getAccessToken = () => {
  const configToken = functions.config()?.mercadopago?.token;
  return process.env.MERCADO_PAGO_ACCESS_TOKEN || configToken || "";
};

exports.gerarPixMensalidade = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const token = getAccessToken();
  if (!token) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Access Token do Mercado Pago não configurado no backend."
    );
  }

  const amount = Number(data?.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Valor inválido.");
  }

  const description = String(data?.description || "Mensalidade");
  const idempotencyKey = String(
    data?.idempotencyKey || `pix_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );
  const emailPagador = context.auth.token?.email;
  if (!emailPagador) {
    throw new functions.https.HttpsError("failed-precondition", "E-mail do pagador não encontrado.");
  }

  const payload = {
    transaction_amount: amount,
    description,
    payment_method_id: "pix",
    payer: {
      email: emailPagador,
    },
  };

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const dataResponse = await response.json();
  if (!response.ok) {
    const mensagem = dataResponse?.message || dataResponse?.error || "Erro ao gerar PIX.";
    throw new functions.https.HttpsError("internal", mensagem, dataResponse);
  }

  const transaction = dataResponse?.point_of_interaction?.transaction_data || {};
  return {
    qr_code_base64: transaction.qr_code_base64 || "",
    qr_code: transaction.qr_code || "",
    ticket_url: transaction.ticket_url || "",
  };
});
