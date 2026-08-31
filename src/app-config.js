import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { orchestratorRoot } from "./paths.js";

export const appsRoot = path.join(orchestratorRoot, "apps");

export function appDirectoryFor(projectPath, root = appsRoot) {
  return path.join(root, path.basename(path.resolve(projectPath)));
}

export async function listApps(root = appsRoot) {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

export async function loadProjectConfig(projectPath, root = appsRoot) {
  const directory = appDirectoryFor(projectPath, root);
  const resolve = (value) =>
    value ? (path.isAbsolute(value) ? value : path.join(directory, value)) : "";

  let config = {};
  const configPath = path.join(directory, "app.json");
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(await readFile(configPath, "utf8"));
    } catch (error) {
      throw new Error(`${configPath} não é JSON válido: ${error.message}`);
    }
  }

  return {
    name: path.basename(directory),
    directory,
    exists: existsSync(directory),
    provider: config.provider,
    profile: config.profile,
    marketingMode: config.marketingMode,
    androidPackage: config.androidPackage,
    androidActivity: config.androidActivity,
    adbDevice: config.adbDevice,
    adbSteps: resolve(config.adbSteps),
    buildCommand: config.buildCommand,
    appCategory: config.appCategory,
    competitors: Array.isArray(config.competitors)
      ? config.competitors.join(",")
      : config.competitors,
    tasksDirectory: resolve(config.tasksDirectory || "tarefas"),
    rulesFile: resolve(config.rules || "regras.md"),
  };
}

export async function loadAppRules(app) {
  if (!app?.rulesFile || !existsSync(app.rulesFile)) return "";
  try {
    return (await readFile(app.rulesFile, "utf8")).trim();
  } catch {
    return "";
  }
}

export function resolveTaskFile(value, app) {
  if (!value) return { taskFile: "", acceptanceFile: "" };
  if (existsSync(value)) {
    return { taskFile: value, acceptanceFile: pairedAcceptance(value) };
  }
  const fromRoot = path.resolve(orchestratorRoot, value);
  if (existsSync(fromRoot)) {
    return { taskFile: fromRoot, acceptanceFile: pairedAcceptance(fromRoot) };
  }
  if (app?.tasksDirectory) {
    const named = path.join(app.tasksDirectory, `${value}.md`);
    if (existsSync(named)) {
      return { taskFile: named, acceptanceFile: pairedAcceptance(named) };
    }
  }
  return { taskFile: value, acceptanceFile: "" };
}

function pairedAcceptance(taskFile) {
  const candidate = taskFile.replace(/\.md$/, ".aceitacao.md");
  return candidate !== taskFile && existsSync(candidate) ? candidate : "";
}
