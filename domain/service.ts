export enum ServiceStatus {
  SOLICITADO = "aguardando",
  PROPOSTA_ENVIADA = "valor_pendente",
  PROPOSTA_ACEITA = "aceito",
  A_CAMINHO = "a_caminho",
  EM_ANDAMENTO = "andamento",
  EM_EXECUCAO = "execucao",
  AGUARDANDO_CONFIRMACAO = "aguardando_confirmacao",
  CONCLUIDO = "realizado",
  AVALIADO = "avaliado",
  CANCELADO = "cancelado",
  PROBLEMA = "problema",
}

export type ServiceActor = "contratante" | "prestador" | "admin" | "sistema";

export type ServiceTimelineEvent = {
  status: ServiceStatus;
  at?: unknown;
  actorId?: string;
  actor?: ServiceActor;
  note?: string;
};

export type ServiceProposal = {
  laborAmount: number;
  materialsAmount: number;
  travelFee: number;
  discount: number;
  totalAmount: number;
  deadlineDays: number;
  validUntil: unknown;
  notes: string;
  version: number;
  status: "pending" | "accepted" | "rejected" | "change_requested";
  createdAt?: unknown;
  createdBy?: string;
};

const aliases: Record<string, ServiceStatus> = {
  aguardando: ServiceStatus.SOLICITADO,
  solicitado: ServiceStatus.SOLICITADO,
  "não realizado": ServiceStatus.SOLICITADO,
  "nao realizado": ServiceStatus.SOLICITADO,
  valor_pendente: ServiceStatus.PROPOSTA_ENVIADA,
  proposta_enviada: ServiceStatus.PROPOSTA_ENVIADA,
  aceito: ServiceStatus.PROPOSTA_ACEITA,
  "a fazer": ServiceStatus.PROPOSTA_ACEITA,
  agendado: ServiceStatus.PROPOSTA_ACEITA,
  a_caminho: ServiceStatus.A_CAMINHO,
  "a caminho": ServiceStatus.A_CAMINHO,
  andamento: ServiceStatus.EM_ANDAMENTO,
  "em andamento": ServiceStatus.EM_ANDAMENTO,
  iniciado: ServiceStatus.EM_ANDAMENTO,
  execucao: ServiceStatus.EM_EXECUCAO,
  "em execucao": ServiceStatus.EM_EXECUCAO,
  "em execução": ServiceStatus.EM_EXECUCAO,
  aguardando_confirmacao: ServiceStatus.AGUARDANDO_CONFIRMACAO,
  realizado: ServiceStatus.CONCLUIDO,
  finalizado: ServiceStatus.CONCLUIDO,
  concluido: ServiceStatus.CONCLUIDO,
  "concluído": ServiceStatus.CONCLUIDO,
  avaliado: ServiceStatus.AVALIADO,
  cancelado: ServiceStatus.CANCELADO,
  rejeitado: ServiceStatus.CANCELADO,
  problema: ServiceStatus.PROBLEMA,
};

export function normalizeServiceStatus(value: unknown): ServiceStatus {
  return aliases[String(value || "aguardando").trim().toLocaleLowerCase("pt-BR")] || ServiceStatus.SOLICITADO;
}

export const SERVICE_STEPS: ReadonlyArray<{ status: ServiceStatus; label: string }> = [
  { status: ServiceStatus.SOLICITADO, label: "Solicitado" },
  { status: ServiceStatus.PROPOSTA_ENVIADA, label: "Proposta enviada" },
  { status: ServiceStatus.PROPOSTA_ACEITA, label: "Proposta aceita" },
  { status: ServiceStatus.A_CAMINHO, label: "A caminho" },
  { status: ServiceStatus.EM_ANDAMENTO, label: "Em andamento" },
  { status: ServiceStatus.EM_EXECUCAO, label: "Em execução" },
  { status: ServiceStatus.AGUARDANDO_CONFIRMACAO, label: "Aguardando confirmação" },
  { status: ServiceStatus.CONCLUIDO, label: "Concluído" },
  { status: ServiceStatus.AVALIADO, label: "Avaliado" },
];

export function serviceStatusLabel(value: unknown) {
  const status = normalizeServiceStatus(value);
  if (status === ServiceStatus.CANCELADO) return "Cancelado";
  if (status === ServiceStatus.PROBLEMA) return "Com problema";
  return SERVICE_STEPS.find((step) => step.status === status)?.label || "Solicitado";
}

export function proposalTotal(parts: Pick<ServiceProposal, "laborAmount" | "materialsAmount" | "travelFee" | "discount">) {
  return Math.max(0, parts.laborAmount + parts.materialsAmount + parts.travelFee - parts.discount);
}
