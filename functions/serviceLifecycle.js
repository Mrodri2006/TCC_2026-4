const aliases = {
  "a fazer": "aceito",
  agendado: "aceito",
  "em andamento": "andamento",
  finalizado: "realizado",
  concluido: "realizado",
  concluído: "realizado",
  "não realizado": "aguardando",
  "nao realizado": "aguardando",
};

const transitions = {
  aguardando: ["valor_pendente", "rejeitado", "cancelado"],
  valor_pendente: ["aceito", "rejeitado", "cancelado"],
  aceito: ["andamento", "aguardando_confirmacao", "cancelado", "problema"],
  andamento: ["aguardando_confirmacao", "cancelado", "problema"],
  aguardando_confirmacao: ["realizado", "problema"],
  problema: ["andamento", "realizado", "cancelado"],
  realizado: [],
  rejeitado: [],
  cancelado: [],
};

const actorTransitions = {
  prestador: new Set(["valor_pendente", "rejeitado", "andamento", "aguardando_confirmacao", "cancelado", "problema"]),
  contratante: new Set(["aceito", "rejeitado", "realizado", "cancelado", "problema"]),
  admin: new Set(Object.keys(transitions)),
};

function normalizeServiceStatus(value) {
  const normalized = String(value || "aguardando").trim().toLowerCase();
  return aliases[normalized] || normalized;
}

function canTransitionService(current, next, actor) {
  const from = normalizeServiceStatus(current);
  const to = normalizeServiceStatus(next);
  return Boolean(transitions[from]?.includes(to) && actorTransitions[actor]?.has(to));
}

module.exports = { normalizeServiceStatus, canTransitionService };
