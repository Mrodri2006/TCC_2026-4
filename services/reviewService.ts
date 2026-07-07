import { firestore } from "../firebase";

export async function getProviderRating(providerId: string, fallback: any = {}) {
  const fallbackRating = {
    avaliacao: Number(fallback.avaliacao || 0),
    numeroAvaliacoes: Number(fallback.numeroAvaliacoes || 0),
  };
  try {
    const snapshot = await firestore.collection("Usuario").doc(providerId).collection("Avaliacoes").get();
    if (snapshot.empty) return fallbackRating;
    const sum = snapshot.docs.reduce((total, doc) => total + Number(doc.data().avaliacaoNota || 0), 0);
    return { avaliacao: sum / snapshot.size, numeroAvaliacoes: snapshot.size };
  } catch (error: any) {
    if (String(error?.code || "") === "permission-denied") return fallbackRating;
    throw error;
  }
}
