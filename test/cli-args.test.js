import assert from "node:assert/strict";
import test from "node:test";

import { cleanArgumentValue, parseArguments } from "../src/cli.js";

const groupSeparator = String.fromCharCode(0x1d);
const escape = String.fromCharCode(0x1b);

test("valor perde caracteres de controle colados do terminal", () => {
  assert.equal(cleanArgumentValue(`${groupSeparator}ideias`), "ideias");
  assert.equal(cleanArgumentValue(`${escape}]ideias`), "]ideias");
  assert.equal(cleanArgumentValue("  ideias \n"), "ideias");
  assert.equal(cleanArgumentValue("com.exemplo.app"), "com.exemplo.app");
});

test("texto solto vira a tarefa", () => {
  const parsed = parseArguments([
    "--project",
    "/tmp/meu-app",
    "deixar a tela mais profissional",
  ]);
  assert.equal(parsed.project, "/tmp/meu-app");
  assert.equal(parsed.task, "deixar a tela mais profissional");
});

test("dois textos soltos são recusados", () => {
  assert.throws(
    () => parseArguments(["--project", "/tmp/x", "um texto", "outro texto"]),
    /Só um texto solto/,
  );
});

test("flag desconhecida sugere a certa", () => {
  assert.throws(() => parseArguments(["--texto", "x"]), /Você quis dizer --task/);
});
