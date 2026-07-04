export type ReputationLevel = "Bronze" | "Prata" | "Ouro" | "Diamante";

export type Reputation = {
  average: number;
  reviews: number;
  completed: number;
  responseMinutes: number | null;
  acceptanceRate: number;
  cancellationRate: number;
  level: ReputationLevel;
  badges: string[];
};

export function calculateReputation(data: any): Reputation {
  const average = Number(data?.avaliacao || 0);
  const reviews = Number(data?.numeroAvaliacoes || 0);
  const completed = Number(data?.servicosConcluidos || 0);
  const accepted = Number(data?.servicosAceitos || 0);
  const rejected = Number(data?.servicosRejeitados || 0);
  const cancelled = Number(data?.servicosCancelados || 0);
  const responded = accepted + rejected;
  const acceptanceRate = responded ? Math.round((accepted / responded) * 100) : 0;
  const cancellationRate = accepted ? Math.round((cancelled / accepted) * 100) : 0;
  const score = average * 15 + Math.min(completed, 100) * 0.25 + acceptanceRate * 0.1 - cancellationRate * 0.2;
  const level: ReputationLevel = score >= 95 ? "Diamante" : score >= 75 ? "Ouro" : score >= 50 ? "Prata" : "Bronze";
  const badges = [
    ...(data?.verificado === true ? ["Verificado"] : []),
    ...(data?.plano === "premium" || data?.premium === true ? ["Premium"] : []),
    ...(average >= 4.8 && reviews >= 10 ? ["Excelente atendimento"] : []),
  ];
  return { average, reviews, completed, responseMinutes: Number.isFinite(Number(data?.tempoMedioRespostaMinutos)) ? Number(data.tempoMedioRespostaMinutos) : null, acceptanceRate, cancellationRate, level, badges };
}
