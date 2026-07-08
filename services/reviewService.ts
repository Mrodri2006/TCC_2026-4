import { firestore, functions } from "../firebase";

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
    const response = await functions.httpsCallable("obterAvaliacaoPrestador")({ prestadorId: providerId });
    const data = response?.data as any;
    const avaliacao = Number(data?.avaliacao);
    const numeroAvaliacoes = Number(data?.numeroAvaliacoes);
    if (Number.isFinite(avaliacao) && Number.isFinite(numeroAvaliacoes)) {
      return { avaliacao, numeroAvaliacoes };
    }
  } catch (error: any) {
    const code = String(error?.code || "");
    if (!code.includes("not-found") && !code.includes("unavailable") && !code.includes("internal")) throw error;
  }
  try {
    const services = await firestore.collection("ServicosAgendados").doc(providerId)
      .collection("ServicoStatus").where("avaliado", "==", true).get();
    const rating = summarize(services.docs);
    if (rating) return rating;
  } catch (error: any) {
    if (String(error?.code || "") !== "permission-denied") throw error;
  }
  try {
    const reviews = await firestore.collection("Usuario").doc(providerId).collection("Avaliacoes").get();
    return summarize(reviews.docs) || fallbackRating;
  } catch (error: any) {
    if (String(error?.code || "") !== "permission-denied") throw error;
    return fallbackRating;
  }
}
