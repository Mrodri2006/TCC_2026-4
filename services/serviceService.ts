import { functions } from "../firebase";
import type { ServiceProposal } from "../domain/service";

export type SendProposalInput = Pick<ServiceProposal, "laborAmount" | "materialsAmount" | "travelFee" | "discount" | "deadlineDays" | "notes"> & {
  serviceId: string;
  clientId: string;
  validityDays: number;
};

export async function sendServiceProposal(input: SendProposalInput) {
  const result = await functions.httpsCallable("enviarPropostaServico")(input);
  return result.data as { ok: true; totalAmount: number; version: number };
}

export async function respondServiceProposal(input: {
  serviceId: string;
  providerId: string;
  action: "accept" | "reject" | "request_change";
  message?: string;
}) {
  const result = await functions.httpsCallable("responderPropostaServico")(input);
  return result.data as { ok: true; status: string };
}
