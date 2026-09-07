import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanArgumentValue,
  parseArguments,
  parseQueueNames,
} from "../src/cli.js";

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

test("--queue aceita vírgula e repetição; --fila sugere --queue", () => {
  assert.deepEqual(parseQueueNames("login,grupos"), ["login", "grupos"]);
  assert.deepEqual(parseQueueNames(["login", "grupos, sync"]), [
    "login",
    "grupos",
    "sync",
  ]);
  assert.deepEqual(parseQueueNames(" ,, "), []);
  assert.deepEqual(parseQueueNames(undefined), []);

  assert.equal(parseArguments(["--queue", "login,grupos"]).queue, "login,grupos");
  assert.throws(
    () => parseArguments(["--fila", "login,grupos"]),
    /Você quis dizer --queue/,
  );
});

test("--token-budget aceita sufixo k/m e rejeita lixo", async () => {
  const { parseTokenBudget } = await import("../src/cli.js");
  assert.equal(parseTokenBudget("800k"), 800_000);
  assert.equal(parseTokenBudget("1.5m"), 1_500_000);
  assert.equal(parseTokenBudget("250000"), 250_000);
  assert.equal(parseTokenBudget(undefined), 0);
  assert.throws(() => parseTokenBudget("muitos"), /token-budget/);
});

test("hardenEnvironment completa PATH, SDK e env do app sem sobrescrever", async () => {
  const { hardenEnvironment } = await import("../src/cli.js");
  const { mkdtemp, mkdir } = await import("node:fs/promises");
  const os = (await import("node:os")).default;
  const path = (await import("node:path")).default;

  const home = await mkdtemp(path.join(os.tmpdir(), "orq-home-"));
  await mkdir(path.join(home, "Library", "Android", "sdk"), { recursive: true });

  const env = hardenEnvironment(
    { FOO: "do-app", PATH_EXTRA: "x" },
    { PATH: "/usr/bin", FOO: "ja-definido" },
    home,
  );

  assert.equal(env.FOO, "ja-definido");
  assert.equal(env.PATH_EXTRA, "x");
  assert.equal(env.ANDROID_HOME, path.join(home, "Library", "Android", "sdk"));
  assert.ok(env.PATH.startsWith(path.dirname(process.execPath)));
  assert.ok(env.PATH.includes(path.join(env.ANDROID_HOME, "platform-tools")));
  assert.ok(env.PATH.includes("/usr/bin"));
});

test("device-state valida valores e a fila aceita sufixo por tarefa", async () => {
  const { parseDeviceState, parseQueueEntryName } = await import("../src/cli.js");
  assert.equal(parseDeviceState(undefined), "manter");
  assert.equal(parseDeviceState("limpo"), "limpo");
  assert.throws(() => parseDeviceState("zerado"), /device-state/);

  assert.deepEqual(parseQueueEntryName("login:limpo"), {
    name: "login",
    deviceState: "limpo",
  });
  assert.deepEqual(parseQueueEntryName("grupos"), {
    name: "grupos",
    deviceState: null,
  });
  assert.deepEqual(parseQueueEntryName("pasta/tarefa.md"), {
    name: "pasta/tarefa.md",
    deviceState: null,
  });
});
