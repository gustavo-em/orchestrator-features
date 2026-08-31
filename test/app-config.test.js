import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  appDirectoryFor,
  loadAppRules,
  loadProjectConfig,
  resolveTaskFile,
} from "../src/app-config.js";

const projectPath = "/tmp/ideias-organize-task";

async function makeAppsRoot({ withConfig = true } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "orq-apps-"));
  if (!withConfig) return root;

  const app = path.join(root, "ideias-organize-task");
  await mkdir(path.join(app, "tarefas"), { recursive: true });
  await mkdir(path.join(app, "adb"), { recursive: true });
  await writeFile(
    path.join(app, "app.json"),
    JSON.stringify({
      provider: "claude",
      profile: "unattended",
      androidPackage: "com.exemplo.app",
      adbSteps: "adb/hoje.json",
      competitors: ["Todoist", "TickTick"],
    }),
  );
  await writeFile(path.join(app, "tarefas", "hoje.md"), "tarefa");
  await writeFile(path.join(app, "tarefas", "hoje.aceitacao.md"), "criterios");
  await writeFile(path.join(app, "adb", "hoje.json"), "[]");
  return root;
}

test("configuração é encontrada pelo nome da pasta do projeto", async () => {
  const root = await makeAppsRoot();
  try {
    assert.equal(
      appDirectoryFor(projectPath, root),
      path.join(root, "ideias-organize-task"),
    );

    const app = await loadProjectConfig(projectPath, root);
    assert.equal(app.exists, true);
    assert.equal(app.name, "ideias-organize-task");
    assert.equal(app.provider, "claude");
    assert.equal(app.profile, "unattended");
    assert.equal(app.androidPackage, "com.exemplo.app");
    assert.equal(app.adbSteps, path.join(root, "ideias-organize-task", "adb", "hoje.json"));
    assert.equal(app.competitors, "Todoist,TickTick");
    assert.equal("projectPath" in app, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("projeto sem configuração ainda roda, tudo vindo da detecção", async () => {
  const root = await makeAppsRoot({ withConfig: false });
  try {
    const app = await loadProjectConfig("/tmp/app-novo", root);
    assert.equal(app.exists, false);
    assert.equal(app.provider, undefined);
    assert.equal(app.androidPackage, undefined);
    assert.equal(await loadAppRules(app), "");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("nome curto de tarefa casa com o arquivo de aceitação", async () => {
  const root = await makeAppsRoot();
  try {
    const app = await loadProjectConfig(projectPath, root);
    const resolved = resolveTaskFile("hoje", app);

    assert.equal(resolved.taskFile, path.join(app.tasksDirectory, "hoje.md"));
    assert.equal(
      resolved.acceptanceFile,
      path.join(app.tasksDirectory, "hoje.aceitacao.md"),
    );

    const passthrough = resolveTaskFile("nao-existe", app);
    assert.equal(passthrough.taskFile, "nao-existe");
    assert.equal(passthrough.acceptanceFile, "");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("regras do app viram invariantes carregadas do disco", async () => {
  const root = await makeAppsRoot();
  try {
    const app = await loadProjectConfig(projectPath, root);
    assert.equal(await loadAppRules(app), "");

    await writeFile(
      path.join(root, "ideias-organize-task", "regras.md"),
      "  Filete fica.  ",
    );
    const reloaded = await loadProjectConfig(projectPath, root);
    assert.equal(await loadAppRules(reloaded), "Filete fica.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
