export type ProviderVerificationStatus = "approved" | "pending" | "rejected" | "none";

export type ProviderTrustSummary = {
  status: ProviderVerificationStatus;
  verified: boolean;
  pending: boolean;
  rejected: boolean;
  score: number;
  completed: number;
  total: number;
  label: string;
  description: string;
  missing: string[];
};

const hasText = (value: any) => String(value || "").trim().length > 0;

const hasList = (value: any) => {
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  return hasText(value);
};

export function getProviderVerificationStatus(provider: any = {}): ProviderVerificationStatus {
  const raw = String(
    provider.verificacaoStatus ||
      provider.verificationStatus ||
      provider.statusVerificacao ||
      ""
  ).toLowerCase();

  if (
    provider.prestadorVerificado === true ||
    provider.documentosVerificados === true ||
    provider.verificado === true ||
    provider.verified === true ||
    ["aprovado", "approved", "verified", "verificado"].includes(raw)
  ) {
    return "approved";
  }

  if (["pendente", "pending", "em_analise", "em analise", "analysis"].includes(raw)) {
    return "pending";
  }

  if (["reprovado", "rejected", "recusado"].includes(raw)) {
    return "rejected";
  }

  return "none";
}

export function getProviderTrustSummary(provider: any = {}): ProviderTrustSummary {
  const checks = [
    { label: "Foto de perfil", done: hasText(provider.fotoPerfil || provider.foto || provider.photoURL) },
    { label: "Telefone informado", done: hasText(provider.fone || provider.telefone || provider.phone) },
    { label: "Cidade/localização", done: hasText(provider.localizacao || provider.cidade) },
    { label: "Experiência descrita", done: hasText(provider.experiencia || provider.descricao) },
    { label: "Especialidade definida", done: hasList(provider.especialidades) || hasText(provider.profissao || provider.tipo) },
    { label: "Reputação inicial", done: Number(provider.numeroAvaliacoes || 0) > 0 || Number(provider.servicosConcluidos || 0) > 0 },
  ];

  const completed = checks.filter((check) => check.done).length;
  const total = checks.length;
  const score = Math.round((completed / total) * 100);
  const status = getProviderVerificationStatus(provider);
  const missing = checks.filter((check) => !check.done).map((check) => check.label);

  if (status === "approved") {
    return {
      status,
      verified: true,
      pending: false,
      rejected: false,
      score: 100,
      completed,
      total,
      label: "Verificado",
      description: "Dados revisados pela plataforma.",
      missing,
    };
  }

  if (status === "pending") {
    return {
      status,
      verified: false,
      pending: true,
      rejected: false,
      score,
      completed,
      total,
      label: "Em análise",
      description: "Solicitação enviada para avaliação do administrador.",
      missing,
    };
  }

  if (status === "rejected") {
    return {
      status,
      verified: false,
      pending: false,
      rejected: true,
      score,
      completed,
      total,
      label: "Revisar dados",
      description: "A verificação precisa de ajustes no perfil.",
      missing,
    };
  }

  return {
    status,
    verified: false,
    pending: false,
    rejected: false,
    score,
    completed,
    total,
    label: score >= 84 ? "Perfil completo" : score >= 50 ? "Perfil em evolução" : "Perfil inicial",
    description:
      score >= 84
        ? "Perfil bem preenchido e pronto para receber mais destaque."
        : "Complete os dados para aumentar a confiança do cliente.",
    missing,
  };
}
