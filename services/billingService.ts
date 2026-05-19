import { functions } from "../firebase";

type CreateMensalidadeMode = "pix" | "checkout" | "both";

export type MensalidadeInvoice = {
  id: string;
  periodKey: string;
  amount: number;
  dueDate?: any;
  graceUntil?: any;
  status: "pending" | "overdue" | "blocked" | "paid" | string;
  mpPaymentId?: string | null;
  mpStatus?: string | null;
  pix?: { qr_code_base64: string; qr_code: string; ticket_url: string };
  checkout?: { init_point: string; preferenceId: string };
};

export type MensalidadeStatus = {
  assinaturaAtiva: boolean;
  contaAtiva: boolean;
  statusPagamento: string | null;
  valorMensalidade: number | null;
  dataCadastro: any | null;
  dataVencimento: any | null;
  ultimoPagamento: any | null;
  invoice: MensalidadeInvoice | null;
};

export async function createMensalidade(mode: CreateMensalidadeMode = "pix") {
  const callable = functions.httpsCallable("createMensalidade");
  const res = await callable({ mode });
  return res.data as any;
}

export async function getMensalidadeStatus() {
  const callable = functions.httpsCallable("getMensalidadeStatus");
  const res = await callable({});
  return res.data as MensalidadeStatus;
}

export type MercadoPagoPaymentMethod = {
  id: string;
  name: string;
  payment_type_id: string;
  status: string;
};

export async function getPaymentMethods(includeAll = false) {
  const callable = functions.httpsCallable("getPaymentMethods");
  const res = await callable({ includeAll });
  return res.data as MercadoPagoPaymentMethod[];
}

export async function getPaymentMethodsByBin(bin: string) {
  const callable = functions.httpsCallable("getPaymentMethodsByBin");
  const res = await callable({ bin });
  return res.data as MercadoPagoPaymentMethod[];
}

export async function getInstallments(params: { bin: string; amount: number; paymentMethodId?: string }) {
  const callable = functions.httpsCallable("getInstallments");
  const res = await callable(params);
  return res.data as any;
}

export async function getIdentificationTypes() {
  const callable = functions.httpsCallable("getIdentificationTypes");
  const res = await callable({});
  return res.data as any;
}

export async function getCardIssuers(params: { bin: string; paymentMethodId: string }) {
  const callable = functions.httpsCallable("getCardIssuers");
  const res = await callable(params);
  return res.data as any;
}

export async function createOrder(params: {
  totalAmount: number;
  paymentMethodId: string;
  token: string;
  installments?: number;
  paymentType?: string;
  externalReference?: string;
  payerEmail?: string;
  idempotencyKey?: string;
}) {
  const callable = functions.httpsCallable("createOrder");
  const res = await callable(params);
  return res.data as any;
}
