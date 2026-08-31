import assert from "node:assert/strict";
import test from "node:test";

import {
  centerOfBounds,
  findNodeByText,
  validateAdbSteps,
} from "../src/android-test-driver.js";

test("centro do elemento sai dos bounds do uiautomator", () => {
  assert.deepEqual(centerOfBounds("[0,100][1080,300]"), [540, 200]);
  assert.equal(centerOfBounds("lixo"), null);
});

test("busca por texto casa texto e content-desc, sem caso", () => {
  const nodes = [
    { text: "HOJE", bounds: "[0,0][100,50]" },
    { text: "Sem prazo  7", bounds: "[0,60][1080,140]" },
    { "content-desc": "Nova tarefa", bounds: "[800,1900][1040,2040]" },
  ];

  assert.equal(findNodeByText(nodes, "sem prazo").bounds, "[0,60][1080,140]");
  assert.equal(findNodeByText(nodes, "nova tarefa")["content-desc"], "Nova tarefa");
  assert.equal(findNodeByText(nodes, "inexistente"), null);
});

test("novos passos são aceitos e ação inventada é recusada", () => {
  const steps = validateAdbSteps([
    { action: "tapText", value: "Sem prazo", optional: true },
    { action: "scrollToEnd", times: 3 },
    { action: "checkpoint", name: "fim" },
  ]);
  assert.equal(steps.length, 3);
  assert.throws(
    () => validateAdbSteps([{ action: "instalarApk" }]),
    /Ação ADB não permitida/,
  );
});
