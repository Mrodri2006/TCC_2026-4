import firebase from "firebase/compat/app";
import { auth, firestore, functions } from "../firebase";
import type { ServiceProposal } from "../domain/service";

export type SendProposalInput = Pick<ServiceProposal, "laborAmount" | "materialsAmount" | "travelFee" | "discount" | "deadlineDays" | "notes"> & {
  serviceId: string;
  clientId: string;
  validityDays: number;
};

export async function sendServiceProposal(input: SendProposalInput) {
  try {
    const result = await functions.httpsCallable("enviarPropostaServico")(input);
    return result.data as { ok: true; totalAmount: number; version: number };
  } catch (error: any) {
    if (!String(error?.code || error?.message || "").includes("not-found")) throw error;
    const providerId = auth.currentUser?.uid;
    if (!providerId) throw error;
    const totalAmount = Math.max(0, Number((input.laborAmount + input.materialsAmount + input.travelFee - input.discount).toFixed(2)));
    const providerRef = firestore.collection("ServicosAgendados").doc(providerId).collection("ServicoStatus").doc(input.serviceId);
    const clientRef = firestore.collection("ServicosClientes").doc(input.clientId).collection("ServicoStatus").doc(input.serviceId);
    const providerSnapshot = await providerRef.get();
    const service = providerSnapshot.data() || {};
    if (!providerSnapshot.exists || service.prestadorId !== providerId || service.clienteId !== input.clientId) throw new Error("service-permission-denied");
    const version = Number(service.proposalVersion || 0) + 1;
    const validUntil = firebase.firestore.Timestamp.fromMillis(Date.now() + input.validityDays * 86400000);
    const proposal = { laborAmount: input.laborAmount, materialsAmount: input.materialsAmount, travelFee: input.travelFee, discount: input.discount, totalAmount, deadlineDays: input.deadlineDays, validUntil, notes: input.notes.trim().slice(0, 1000), version, status: "pending", createdBy: providerId, createdAt: new Date() };
    const update = { status: "valor_pendente", valor: totalAmount, valorProposto: totalAmount, currentProposal: proposal, proposalVersion: version, timeline: firebase.firestore.FieldValue.arrayUnion({ status: "valor_pendente", actor: "prestador", actorId: providerId, note: `Proposta ${version} enviada`, at: new Date() }), dataPropostaValor: firebase.firestore.FieldValue.serverTimestamp(), dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp() };
    const batch = firestore.batch();
    batch.set(providerRef, update, { merge: true });
    batch.set(clientRef, update, { merge: true });
    await batch.commit();
    return { ok: true, totalAmount, version };
  }
}

export async function respondServiceProposal(input: {
  serviceId: string;
  providerId: string;
  action: "accept" | "reject" | "request_change";
  message?: string;
}) {
  try {
    const result = await functions.httpsCallable("responderPropostaServico")(input);
    return result.data as { ok: true; status: string };
  } catch (error: any) {
    if (!String(error?.code || error?.message || "").includes("not-found")) throw error;
    const clientId = auth.currentUser?.uid;
    if (!clientId) throw error;
    const providerRef = firestore.collection("ServicosAgendados").doc(input.providerId).collection("ServicoStatus").doc(input.serviceId);
    const clientRef = firestore.collection("ServicosClientes").doc(clientId).collection("ServicoStatus").doc(input.serviceId);
    const snapshot = await providerRef.get(); const service = snapshot.data() || {};
    if (!snapshot.exists || service.clienteId !== clientId || service.prestadorId !== input.providerId || service.status !== "valor_pendente") throw new Error("proposal-unavailable");
    const status = input.action === "accept" ? "aceito" : input.action === "reject" ? "rejeitado" : "valor_pendente";
    const proposalStatus = input.action === "accept" ? "accepted" : input.action === "reject" ? "rejected" : "change_requested";
    const update = { status, valorAceito: input.action === "accept", currentProposal: { ...(service.currentProposal || {}), status: proposalStatus, responseMessage: input.message || "", respondedAt: new Date() }, negotiationHistory: firebase.firestore.FieldValue.arrayUnion({ action: input.action, message: input.message || "", actorId: clientId, at: new Date(), version: Number(service.proposalVersion || 1) }), timeline: firebase.firestore.FieldValue.arrayUnion({ status, actor: "contratante", actorId: clientId, note: input.message || proposalStatus, at: new Date() }), dataRespostaValor: firebase.firestore.FieldValue.serverTimestamp(), dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp() };
    const batch = firestore.batch(); batch.set(providerRef, update, { merge: true }); batch.set(clientRef, update, { merge: true }); await batch.commit();
    return { ok: true, status };
  }
}
