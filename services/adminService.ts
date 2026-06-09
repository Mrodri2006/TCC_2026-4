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
