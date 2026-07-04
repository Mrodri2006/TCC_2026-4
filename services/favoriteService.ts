import firebase from "firebase/compat/app";
import { auth, firestore } from "../firebase";

const favoriteRef = (providerId: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("auth-required");
  return firestore.collection("Usuario").doc(uid).collection("Favoritos").doc(providerId);
};

export async function setProviderFavorite(provider: { id: string; nome?: string; profissao?: string }, favorite: boolean) {
  const ref = favoriteRef(provider.id);
  if (!favorite) return ref.delete();
  return ref.set({ providerId: provider.id, nome: provider.nome || "Profissional", profissao: provider.profissao || "Serviços", createdAt: firebase.firestore.FieldValue.serverTimestamp() });
}

export function subscribeProviderFavorite(providerId: string, callback: (favorite: boolean) => void) {
  return favoriteRef(providerId).onSnapshot((snapshot) => callback(snapshot.exists), () => callback(false));
}
