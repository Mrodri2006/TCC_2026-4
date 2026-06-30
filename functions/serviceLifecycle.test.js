const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeServiceStatus, canTransitionService } = require("./serviceLifecycle");

test("normaliza status legados", () => {
  assert.equal(normalizeServiceStatus("a fazer"), "aceito");
  assert.equal(normalizeServiceStatus("Finalizado"), "realizado");
});

test("impede conclusão direta sem confirmação", () => {
  assert.equal(canTransitionService("andamento", "realizado", "contratante"), false);
  assert.equal(canTransitionService("aguardando_confirmacao", "realizado", "contratante"), true);
});

test("impede prestador de confirmar a própria conclusão", () => {
  assert.equal(canTransitionService("aguardando_confirmacao", "realizado", "prestador"), false);
});

test("estados terminais não podem ser reabertos", () => {
  assert.equal(canTransitionService("cancelado", "andamento", "admin"), false);
  assert.equal(canTransitionService("realizado", "andamento", "admin"), false);
});
