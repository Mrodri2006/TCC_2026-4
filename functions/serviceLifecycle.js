const aliases = {
  "a fazer": "aceito",
  agendado: "aceito",
  "a caminho": "a_caminho",
  "em andamento": "andamento",
  "em execucao": "execucao",
  "em execução": "execucao",
  finalizado: "realizado",
  concluido: "realizado",
  concluído: "realizado",
  "não realizado": "aguardando",
  "nao realizado": "aguardando",
};

const transitions = {
  aguardando: ["valor_pendente", "rejeitado", "cancelado"],
  valor_pendente: ["aceito", "rejeitado", "cancelado"],
  aceito: ["a_caminho", "andamento", "aguardando_confirmacao", "cancelado", "problema"],
  a_caminho: ["andamento", "execucao", "aguardando_confirmacao", "cancelado", "problema"],
  andamento: ["execucao", "aguardando_confirmacao", "cancelado", "problema"],
  execucao: ["aguardando_confirmacao", "cancelado", "problema"],
  aguardando_confirmacao: ["realizado", "problema"],
  problema: ["a_caminho", "andamento", "execucao", "realizado", "cancelado"],
  realizado: [],
  rejeitado: [],
  cancelado: [],
};

const actorTransitions = {
  prestador: new Set(["valor_pendente", "rejeitado", "a_caminho", "andamento", "execucao", "aguardando_confirmacao", "cancelado", "problema"]),
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
