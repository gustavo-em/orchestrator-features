import assert from "node:assert/strict";
import test from "node:test";

import { looksLoading } from "../src/android-test-driver.js";

test("tela de bundle carregando não conta como pronta", () => {
  assert.equal(looksLoading([{ text: "Downloading 42.0%" }]), true);
  assert.equal(looksLoading([{ text: "Bundling JavaScript" }]), true);
  assert.equal(looksLoading([]), true);
  assert.equal(looksLoading([{ text: "a" }, { text: "b" }]), true);
});

test("tela com conteúdo real conta como pronta", () => {
  const nodes = [
    { text: "Em aberto" },
    { text: "11 tarefas" },
    { text: "HOJE", clickable: "false" },
    { text: "marcar reuniao com o time" },
    { "content-desc": "Nova tarefa", clickable: "true" },
  ];
  assert.equal(looksLoading(nodes), false);
});
