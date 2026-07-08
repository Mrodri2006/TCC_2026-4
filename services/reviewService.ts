import { firestore } from "../firebase";

export async function getProviderRating(providerId: string, fallback: any = {}) {
  const fallbackRating = {
    avaliacao: Number(fallback.avaliacao || 0),
    numeroAvaliacoes: Number(fallback.numeroAvaliacoes || 0),
  };
  const summarize = (docs: any[]) => {
    const ratings = docs.map((doc) => Number(doc.data().avaliacaoNota))
      .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
    return ratings.length ? {
      avaliacao: ratings.reduce((total, rating) => total + rating, 0) / ratings.length,
      numeroAvaliacoes: ratings.length,
    } : null;
  };
  try {
    const reviews = await firestore.collection("Usuario").doc(providerId).collection("Avaliacoes").get();
    const rating = summarize(reviews.docs);
    if (rating) return { ...rating, avaliacoes: reviews.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
  } catch (error: any) {
    if (String(error?.code || "") !== "permission-denied") throw error;
  }
  try {
    const services = await firestore.collection("ServicosAgendados").doc(providerId)
      .collection("ServicoStatus").where("avaliado", "==", true).get();
    return summarize(services.docs) || fallbackRating;
  } catch (error: any) {
    if (String(error?.code || "") !== "permission-denied") throw error;
    return fallbackRating;
  }
}
