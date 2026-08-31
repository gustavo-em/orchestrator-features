import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { runInteractiveWizard } from "../src/wizard.js";

class FakePrompter {
  constructor({ texts, confirms, selects }) {
    this.texts = [...texts];
    this.confirms = [...confirms];
    this.selects = [...selects];
    this.closed = false;
    this.output = { write() {} };
  }

  async text(_label, defaultValue = "") {
    const value = this.texts.shift();
    return value === "<default>" ? defaultValue : value;
  }

  async confirm() {
    return this.confirms.shift();
  }

  async select() {
    return this.selects.shift();
  }

  close() {
    this.closed = true;
  }
}

test("wizard usa package detectado sem pedir flags", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "orq-wizard-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    path.join(directory, "package.json"),
    JSON.stringify({ name: "app", dependencies: { expo: "latest" } }),
  );
  await writeFile(
    path.join(directory, "app.json"),
    JSON.stringify({ expo: { name: "Meu App", android: { package: "br.meu.app" } } }),
  );

  const prompter = new FakePrompter({
    texts: [
      directory,
      "Criar onboarding",
      "Acessível e rápido",
      "<default>",
      "",
      "",
      "Saúde",
      "Concorrente A, https://example.com/app",
      "3",
      "10",
      "",
      "",
      "<default>",
      "low",
    ],
    confirms: [true],
    selects: ["codex", "full"],
  });

  const config = await runInteractiveWizard({ prompter });

  assert.equal(config.provider, "codex");
  assert.equal(config.android.packageName, "br.meu.app");
  assert.equal(config.android.activity, ".MainActivity");
  assert.equal(config.marketing.mode, "full");
  assert.deepEqual(config.marketing.competitors, [
    "Concorrente A",
    "https://example.com/app",
  ]);
  assert.equal(config.designReasoningEffort, "high");
  assert.equal(config.codeReasoningEffort, "low");
  assert.equal(config.auxiliaryModel, "");
  assert.equal(config.agentTimeoutMs, 600_000);
  assert.equal(prompter.closed, true);
});

test("wizard seleciona Claude Code", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "orq-wizard-claude-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    path.join(directory, "package.json"),
    JSON.stringify({ name: "app", dependencies: { "react-native": "latest" } }),
  );

  const prompter = new FakePrompter({
    texts: [
      directory,
      "Criar tela inicial",
      "Visual profissional",
      "3",
      "10",
      "sonnet",
      "",
      "high",
      "low",
    ],
    confirms: [false],
    selects: ["claude", "none"],
  });

  const config = await runInteractiveWizard({ prompter });

  assert.equal(config.provider, "claude");
  assert.equal(config.model, "sonnet");
  assert.equal(config.android, null);
  assert.equal(config.marketing.mode, "none");
  assert.equal(prompter.closed, true);
});
