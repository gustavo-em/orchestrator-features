import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AndroidTestDriver,
  classifyEvidenceError,
  compactUiHierarchy,
  validateAdbSteps,
} from "../src/android-test-driver.js";

test("compacta árvore UI removendo nós sem sinal útil", () => {
  const xml = `
    <hierarchy>
      <node text="" class="android.view.View" clickable="false" bounds="[0,0][10,10]" />
      <node text="Entrar" resource-id="login" class="android.widget.Button" content-desc="Login" clickable="true" enabled="true" bounds="[0,10][100,50]" />
    </hierarchy>
  `;

  const nodes = compactUiHierarchy(xml);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].text, "Entrar");
  assert.equal(nodes[0]["resource-id"], "login");
});

test("rejeita ação ADB arbitrária", () => {
  assert.throws(
    () => validateAdbSteps([{ action: "shell", value: "rm -rf /" }]),
    /não permitida/,
  );
});

test("aceita ação night e mantém o resto proibido", () => {
  const steps = validateAdbSteps([{ action: "night", value: "yes" }]);
  assert.equal(steps[0].action, "night");
  assert.throws(
    () => validateAdbSteps([{ action: "reboot" }]),
    /não permitida/,
  );
});

test("app fora do foreground após passo religa e registra interrupção", async () => {
  const driver = new AndroidTestDriver({
    packageName: "com.app",
    artifactsDirectory: "/tmp",
    steps: [{ action: "keyevent", value: 4 }],
  });
  const commands = [];
  driver.buildAndInstall = async () => null;
  driver.ensureDevice = async () => "emulator-5554";
  driver.captureScreenshot = async (_dir, name = "final") => ({
    name,
    path: `/tmp/${name}.png`,
  });
  driver.captureUiHierarchy = async () => [{ text: "ok" }, {}, {}, {}];
  let foregroundCalls = 0;
  driver.isAppForeground = async () => {
    foregroundCalls += 1;
    return foregroundCalls > 1;
  };
  driver.launchApp = async () => {
    commands.push("launch");
    return "ok";
  };
  driver.runTextAdb = async (args) => {
    commands.push(args.join(" "));
    return "";
  };

  const evidence = await driver.collectEvidenceExclusive({ cycle: 1 });
  assert.equal(evidence.interruptions.length, 1);
  assert.match(evidence.interruptions[0], /keyevent \(4\)/);
  assert.ok(commands.filter((c) => c === "launch").length >= 2);
});

test("checkpoint marca teclado aberto e a captura final fecha o teclado", async () => {
  const adbCalls = [];
  let keyboardOpen = true;
  const driver = new AndroidTestDriver({
    packageName: "com.app",
    artifactsDirectory: "/tmp",
    steps: [{ action: "checkpoint", name: "com-teclado" }],
  });
  driver.buildAndInstall = async () => null;
  driver.ensureDevice = async () => "emulator-5554";
  driver.isAppForeground = async () => true;
  driver.launchApp = async () => "ok";
  driver.captureScreenshot = async (_d, n = "final") => ({ name: n, path: "/x" });
  driver.captureUiHierarchy = async () => [{ text: "ok" }, {}, {}, {}];
  driver.runTextAdb = async (args) => {
    const joined = args.join(" ");
    adbCalls.push(joined);
    if (joined.includes("mInputShown")) {
      return keyboardOpen ? "mInputShown=true" : "mInputShown=false";
    }
    if (joined === "shell input keyevent 4") keyboardOpen = false;
    return "";
  };

  const evidence = await driver.collectEvidenceExclusive({ cycle: 1 });
  assert.equal(evidence.screenshots[0].keyboard, true);
  assert.equal(evidence.screenshots.at(-1).keyboard, undefined);
  assert.ok(adbCalls.includes("shell input keyevent 4"));

  const steps = validateAdbSteps([{ action: "hideKeyboard" }]);
  assert.equal(steps[0].action, "hideKeyboard");
});

test("passo interativo que não muda a tela entra em ineffectiveSteps", async () => {
  const driver = new AndroidTestDriver({
    packageName: "com.app",
    artifactsDirectory: "/tmp",
    steps: [
      { action: "tap", x: 100, y: 200 },
      { action: "wait", ms: 1 },
      { action: "keyevent", value: 4 },
    ],
  });
  driver.buildAndInstall = async () => null;
  driver.ensureDevice = async () => "emulator-5554";
  driver.isAppForeground = async () => true;
  driver.launchApp = async () => "ok";
  driver.captureScreenshot = async (_d, n = "final") => ({ name: n, path: "/x" });
  driver.runTextAdb = async () => "";
  const trees = [
    [{ text: "a" }, {}, {}, {}], // waitUntilRendered
    [{ text: "a" }, {}, {}, {}], // antes do tap
    [{ text: "a" }, {}, {}, {}], // depois do tap → igual: ineficaz
    [{ text: "b" }, {}, {}, {}], // depois do keyevent → mudou
    [{ text: "b" }, {}, {}, {}], // árvore final
  ];
  driver.captureUiHierarchy = async () => trees.shift() ?? [{ text: "fim" }];

  const evidence = await driver.collectEvidenceExclusive({ cycle: 1 });
  assert.equal(evidence.ineffectiveSteps.length, 1);
  assert.match(evidence.ineffectiveSteps[0], /tap \(100,200\) não alterou/);
});

test("deviceState limpo zera o app uma vez e reseta o tema toda captura", async () => {
  const adbCalls = [];
  const driver = new AndroidTestDriver({
    packageName: "com.app",
    artifactsDirectory: "/tmp",
    deviceState: "limpo",
  });
  driver.buildAndInstall = async () => null;
  driver.ensureDevice = async () => "emulator-5554";
  driver.isAppForeground = async () => true;
  driver.captureScreenshot = async (_d, name = "final") => ({ name, path: "/x" });
  driver.captureUiHierarchy = async () => [{ text: "ok" }, {}, {}, {}];
  driver.launchApp = async () => "ok";
  driver.runTextAdb = async (args) => {
    adbCalls.push(args.join(" "));
    return "";
  };

  await driver.collectEvidenceExclusive({ cycle: 1 });
  await driver.collectEvidenceExclusive({ cycle: 2 });

  const clears = adbCalls.filter((c) => c.includes("pm clear com.app"));
  const themeResets = adbCalls.filter((c) => c.includes("uimode night no"));
  assert.equal(clears.length, 1);
  assert.equal(themeResets.length, 2);
});

test("sem rtk no PATH cai para adb puro e memoriza", async () => {
  const calls = [];
  const driver = new AndroidTestDriver({
    packageName: "com.app",
    artifactsDirectory: "/tmp",
    execFileRunner: async (binary) => {
      calls.push(binary);
      if (binary === "rtk") {
        const missing = new Error("spawn rtk ENOENT");
        missing.code = "ENOENT";
        throw missing;
      }
      return { stdout: "ok", stderr: "" };
    },
  });

  assert.equal(await driver.runTextAdb(["devices"]), "ok");
  assert.deepEqual(calls, ["rtk", "adb"]);

  await driver.runTextAdb(["devices"]);
  assert.deepEqual(calls, ["rtk", "adb", "adb"]);
});

test("lockfile divergente dispara install; em sincronia não", async () => {
  const projectPath = await mkdtemp(path.join(os.tmpdir(), "orq-deps-"));
  await writeFile(path.join(projectPath, "package-lock.json"), '{"v":2}');
  await mkdir(path.join(projectPath, "node_modules"), { recursive: true });
  await writeFile(
    path.join(projectPath, "node_modules", ".package-lock.json"),
    '{"v":1}',
  );

  const driver = new AndroidTestDriver({
    packageName: "com.app",
    artifactsDirectory: "/tmp",
    projectPath,
  });
  let installs = 0;
  driver.runInstall = async () => {
    installs += 1;
    return { status: "OK", output: "" };
  };

  await driver.ensureDependencies();
  assert.equal(installs, 1);

  await writeFile(
    path.join(projectPath, "node_modules", ".package-lock.json"),
    '{"v":2}',
  );
  await driver.ensureDependencies();
  assert.equal(installs, 1);
});

test("classifica build e passo como corrigíveis e o resto como infra", () => {
  const build = new Error("Build falhou");
  build.code = "BUILD_FAILED";
  const step = new Error("tapText não encontrado");
  step.code = "STEP_FAILED";

  assert.equal(classifyEvidenceError(build), "build");
  assert.equal(classifyEvidenceError(step), "step");
  assert.equal(classifyEvidenceError(new Error("device offline")), "infra");
});

test("erro de infra na coleta espera serviços e tenta de novo", async () => {
  let waits = 0;
  let calls = 0;
  const driver = new AndroidTestDriver({
    packageName: "app",
    artifactsDirectory: "/tmp",
    infraRetries: 2,
    infraBackoffMs: 1,
    waitForServices: async () => {
      waits += 1;
    },
  });
  driver.collectEvidenceExclusive = async () => {
    calls += 1;
    if (calls < 3) throw new Error("adb: device offline");
    return { ok: true };
  };

  const result = await driver.collectEvidence({ cycle: 1 });
  assert.deepEqual(result, { ok: true });
  assert.equal(waits, 2);
});

test("build quebrado não é tentado de novo pelo driver", async () => {
  let calls = 0;
  const driver = new AndroidTestDriver({
    packageName: "app",
    artifactsDirectory: "/tmp",
    infraRetries: 3,
    infraBackoffMs: 1,
  });
  driver.collectEvidenceExclusive = async () => {
    calls += 1;
    const failure = new Error("Build falhou antes do teste de tela.");
    failure.code = "BUILD_FAILED";
    throw failure;
  };

  await assert.rejects(() => driver.collectEvidence({ cycle: 1 }), /Build falhou/);
  assert.equal(calls, 1);
});

test("infra que não volta esgota os retries e propaga o erro", async () => {
  let calls = 0;
  const driver = new AndroidTestDriver({
    packageName: "app",
    artifactsDirectory: "/tmp",
    infraRetries: 2,
    infraBackoffMs: 1,
  });
  driver.collectEvidenceExclusive = async () => {
    calls += 1;
    throw new Error("nenhum device conectado");
  };

  await assert.rejects(
    () => driver.collectEvidence({ cycle: 1 }),
    /nenhum device/,
  );
  assert.equal(calls, 3);
});
