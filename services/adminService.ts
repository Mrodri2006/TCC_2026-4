import { firestore } from "../firebase";

export type AdminUsuario = {
  id: string;
  nome?: string;
  email?: string;
  fone?: string;
  tipo?: string;
  admin?: boolean;
  profissao?: string | null;
  [key: string]: any;
};

export async function adminListUsuarios() {
  const snap = await firestore.collection("Usuario").get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as AdminUsuario[];
}

export async function adminUpdateUsuario(uid: string, usuario: Partial<AdminUsuario>) {
  await firestore.collection("Usuario").doc(uid).update({
    nome: usuario.nome || "",
    email: usuario.email || "",
    fone: usuario.fone || "",
    tipo: usuario.admin || usuario.tipo === "admin" ? "admin" : usuario.tipo || "contratante",
    admin: usuario.admin === true || usuario.tipo === "admin",
    profissao: usuario.admin || usuario.tipo === "admin" ? null : usuario.profissao || null,
  });

  const updated = await firestore.collection("Usuario").doc(uid).get();
  return { id: updated.id, ...updated.data() } as AdminUsuario;
}

export async function adminDeleteUsuario(uid: string) {
  await firestore.collection("Usuario").doc(uid).delete();
  return { ok: true };
}

export type ProviderVerificationUpdate = "none" | "pending" | "approved" | "rejected";

export async function adminSetProviderVerification(uid: string, status: ProviderVerificationUpdate) {
  const now = new Date();
  const approved = status === "approved";
  const payload: Record<string, any> = {
    verificacaoStatus:
      status === "approved" ? "aprovado" : status === "pending" ? "pendente" : status === "rejected" ? "reprovado" : "",
    prestadorVerificado: approved,
    documentosVerificados: approved,
    verificacaoAtualizadaEm: now,
  };

  if (status === "approved") {
    payload.verificacaoAprovadaEm = now;
    payload.verificacaoReprovadaEm = null;
  }

  if (status === "rejected") {
    payload.verificacaoReprovadaEm = now;
    payload.verificacaoAprovadaEm = null;
  }

  await firestore.collection("Usuario").doc(uid).set(payload, { merge: true });
  await firestore.collection("Usuario").doc(uid).collection("Notificacoes").add({
    type: "provider_verification",
    title: approved ? "Selo verificado aprovado" : status === "rejected" ? "Verificação precisa de ajuste" : "Verificação em análise",
    body: approved
      ? "Seu perfil recebeu o selo de prestador verificado."
      : status === "rejected"
        ? "O administrador revisou seus documentos. Confira seus dados e envie novamente se necessário."
        : "Seus documentos foram recebidos e estão em análise.",
    lida: false,
    criadoEm: now,
  });
  const updated = await firestore.collection("Usuario").doc(uid).get();
  return { id: updated.id, ...updated.data() } as AdminUsuario;
}
