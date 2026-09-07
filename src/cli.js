#!/usr/bin/env node

import { existsSync, realpathSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AndroidTestDriver } from "./android-test-driver.js";
import { commitMessage, parseTaskList, runBatch } from "./batch.js";
import { runFeatureLoop } from "./orchestrator.js";
import { detectReactNativeProject } from "./project-detector.js";
import {
  loadAppRules,
  loadProjectConfig,
  resolveTaskFile,
} from "./app-config.js";
import { assertNotOrchestrator, orchestratorRoot } from "./paths.js";
import { profileNames, resolveProfile } from "./profiles.js";
import { readMarketCache, writeMarketCache } from "./market-cache.js";
import { buildBatchReport, writeBatchReport } from "./report.js";
import { createAgentRuntime, validateProvider } from "./runtime-factory.js";
import { JsonRunStateStore } from "./state-store.js";
import { runInteractiveWizard } from "./wizard.js";
import { describeHolder, readHolder, withLocks } from "./lock.js";
import { waitForDevice, waitForMetro } from "./services.js";
import {
  checkProviderAuth,
  classifyOutcome,
  explainAgentError,
} from "./preflight.js";
import { createPrinter, hintLine, rule, statusStyle, style } from "./ui.js";
import {
  assertCleanRepository,
  commitWorktree,
  repositoryDirty,
  resolveBaseRef,
} from "./worktree.js";

const defaultWorktreesDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../worktrees",
);

function printHelp() {
  console.log(`
Uso:
  orquestrar-features
  npm start

Forma curta:
  orquestrar-features --project ~/Documents/meu-app "deixar a tela mais profissional"
  orquestrar-features --project ~/Documents/meu-app "..." --plan-only
  orquestrar-features --project ~/Documents/meu-app --task-file hoje

Modo automatizado:
  npm start -- --project /caminho/do/app --task "Descrição da feature"

Lote não supervisionado (várias features em paralelo, uma worktree cada):
  npm start -- --project /caminho/do/app --tasks tarefas.json --profile unattended \
    --android-package com.exemplo.app --build-command "npm run build:android-test"

  tarefas.json: ["Melhorar o onboarding", { "task": "...", "acceptance": "..." }]

Opções:
  --project <caminho>          Pasta do app React Native. O package, a activity e o resto são
                               reconhecidos a partir dela; ajustes opcionais ficam em
                               apps/<nome-da-pasta>/app.json.
  --task <texto>               Tarefa a implementar. Um texto solto entre aspas vale como --task.
  --task-file <arquivo|nome>   Lê a tarefa de um arquivo. Um nome curto resolve
                               apps/<nome-da-pasta>/tarefas/<nome>.md e casa <nome>.aceitacao.md.
  --acceptance <texto>         Critérios de aceitação.
  --acceptance-file <arquivo>  Lê os critérios de um arquivo.
  --provider <nome>            codex ou claude. Padrão: codex.
  --max-cycles <1-10>          Limite do loop. Padrão: 3.
  --android-package <id>       Ativa tester Android. Ex.: com.exemplo.app.
  --android-activity <nome>    Activity inicial. Padrão: .MainActivity.
  --adb-device <serial>        Device específico quando houver mais de um.
  --adb-steps <arquivo.json>   Passos ADB determinísticos antes da captura.
  --no-screen-test             Roda sem device: ignora o pacote Android da config e desliga
                               os gates de tela, design e UX. Para tarefas que não passam pela
                               tela (release, build, documentação, refactor).
  --tasks <arquivo>            Lote a partir de arquivo .json ou de texto com uma tarefa por linha.
  --queue <nomes>              Fila sequencial no mesmo working tree: nomes separados por vírgula,
                               resolvidos como --task-file (ex.: --queue login,grupos). Cada tarefa
                               que termina PASS é commitada e a próxima começa em cima do resultado;
                               se uma parar, a fila para e imprime como retomar.
  --task <texto> (repetido)    Repita --task para montar um lote sem arquivo.
  --resume <runs/arquivo.json> Retoma um run que parou: reaproveita brief, pesquisa de mercado
                               e as sessões dos agentes, e pula direto para a implementação.
  --retries <0-5>              Retoma sozinho quando a parada for recuperável. Padrão: 0.
  --wait <minutos>             Espera em vez de recusar: vale para a trava de outro terminal e
                               também para o Metro e o device ainda não disponíveis. Padrão: 0.
  --metro-port <porta>         Porta do Metro conferida antes de começar. Padrão: 8081.
  --skip-service-check         Não confere Metro nem device antes de começar.
  --dry-run                    Mostra o plano do lote (tarefas, gates, worktrees) e sai.
  --plan-only                  Só analisa e entrega o brief; não edita nenhum arquivo.
  --market-cache-days <n>      Reaproveita pesquisa de mercado recente. 0 desliga. Padrão: 7.
  --concurrency <1-6>          Tarefas simultâneas no lote. Padrão: 2.
  --base-ref <ref>             Base das worktrees. Padrão: HEAD (exige projeto limpo).
  --build-command <cmd>        Build+install rodado na worktree antes de cada captura de tela.
                               Obrigatório no lote com Android. Sugestão para React Native:
                               "npx react-native bundle --platform android --dev false \
                                --entry-file index.js \
                                --bundle-output android/app/src/main/assets/index.android.bundle \
                                --assets-dest android/app/src/main/res && \
                                cd android && ./gradlew installDebug"
  --profile <nome>             fast, unattended ou deep. Ajusta mercado, reasoning, ciclos e gates.
  --marketing-mode <modo>      none, context ou full. Padrão com flags: none.
  --app-category <texto>       Categoria ou público para análise de mercado.
  --competitors <lista>        Nomes/URLs separados por vírgula.
  --agent-timeout <1-60>       Timeout base; implementação recebe no mínimo 30 min. Padrão: 10.
  --model <id>                 Modelo do provedor. Omita para usar o padrão configurado.
  --aux-model <id>             Modelo opcional para tester e revisores.
  --escalation-model <id>      Fallback: agente que trava (BLOCKED) ganha 1 tentativa neste
                               modelo mais forte antes de encerrar. Padrão: opus no Claude;
                               "none" desliga.
  --escalation-reasoning <n>   Reasoning do fallback. Padrão: max (Claude) / xhigh (Codex).
  --token-budget <n>           Teto de tokens do run (entrada não cacheada + saída). Aceita
                               sufixo k/m (ex.: 800k, 1.5m). Estourou, para retomável.
                               Padrão: 0 (desligado).
  --device-state <estado>      Estado do device no início do run: "limpo" zera os dados do
                               app (pm clear) uma vez; "manter" herda o que ficou (padrão).
                               Na fila, por tarefa: --queue login:limpo,grupos.
  --design-reasoning <nível>   Reasoning para UX/visual. Padrão: high.
  --code-reasoning <nível>     Reasoning para implementação. Padrão: low.
  --reasoning <nível>          Compatibilidade: aplica o mesmo nível às duas fases.
  --help                       Exibe esta ajuda.
`);
}

const supportedReasoningEfforts = new Set([
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
  "persistent",
]);
const supportedClaudeEfforts = new Set([
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

function validateReasoningEffort(reasoningEffort, provider = "codex") {
  const supported =
    provider === "claude" ? supportedClaudeEfforts : supportedReasoningEfforts;
  if (!supported.has(reasoningEffort)) {
    throw new Error(
      `Nível de reasoning inválido para ${provider}: ${reasoningEffort}.`,
    );
  }
}

function parseMaxCycles(value) {
  const maxCycles = Number.parseInt(value ?? "3", 10);
  if (!Number.isInteger(maxCycles) || maxCycles < 1 || maxCycles > 10) {
    throw new Error("--max-cycles deve ser um número entre 1 e 10.");
  }
  return maxCycles;
}

function parseWaitMinutes(value) {
  const minutes = Number.parseInt(value ?? "0", 10);
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 240) {
    throw new Error("--wait deve ser um número de minutos entre 0 e 240.");
  }
  return minutes * 60_000;
}

function parseRetries(value) {
  const retries = Number.parseInt(value ?? "0", 10);
  if (!Number.isInteger(retries) || retries < 0 || retries > 5) {
    throw new Error("--retries deve ser um número entre 0 e 5.");
  }
  return retries;
}

function parseConcurrency(value) {
  const concurrency = Number.parseInt(value ?? "2", 10);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) {
    throw new Error("--concurrency deve ser um número entre 1 e 6.");
  }
  return concurrency;
}

export function parseTokenBudget(value) {
  if (value === undefined || value === null || value === "") return 0;
  const match = /^(\d+(?:\.\d+)?)([km]?)$/i.exec(String(value).trim());
  const multiplier = { "": 1, k: 1_000, m: 1_000_000 }[
    match?.[2]?.toLowerCase() ?? ""
  ];
  const budget = match ? Math.round(Number(match[1]) * multiplier) : NaN;
  if (!Number.isInteger(budget) || budget < 0) {
    throw new Error(
      '--token-budget deve ser um número de tokens, com sufixo opcional k ou m (ex.: 800k, 1.5m). 0 desliga.',
    );
  }
  return budget;
}

function parseAgentTimeout(value) {
  const minutes = Number.parseInt(value ?? "10", 10);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
    throw new Error("--agent-timeout deve ser número entre 1 e 60.");
  }
  return minutes * 60_000;
}

const KNOWN_FLAGS = new Set([
  "project",
  "resume",
  "retries",
  "wait",
  "metro-port",
  "skip-service-check",
  "task",
  "task-file",
  "acceptance",
  "acceptance-file",
  "provider",
  "max-cycles",
  "android-package",
  "no-screen-test",
  "android-activity",
  "adb-device",
  "adb-steps",
  "tasks",
  "queue",
  "dry-run",
  "plan-only",
  "market-cache-days",
  "concurrency",
  "base-ref",
  "build-command",
  "worktrees",
  "profile",
  "marketing-mode",
  "app-category",
  "competitors",
  "agent-timeout",
  "model",
  "aux-model",
  "escalation-model",
  "escalation-reasoning",
  "token-budget",
  "device-state",
  "design-reasoning",
  "code-reasoning",
  "reasoning",
  "help",
]);

const FLAG_ALIASES = {
  fila: "queue",
  texto: "task",
  tarefa: "task",
  "arquivo-tarefa": "task-file",
  criterios: "acceptance",
  projeto: "project",
  aplicativo: "project",
  modelo: "model",
  pacote: "android-package",
  "somente-plano": "plan-only",
};

export function cleanArgumentValue(value) {
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .trim();
}

function closestFlag(key) {
  if (FLAG_ALIASES[key]) return FLAG_ALIASES[key];
  const prefix = [...KNOWN_FLAGS].find(
    (known) => known.startsWith(key) || key.startsWith(known),
  );
  return prefix ?? null;
}

function rejectUnknownFlag(key) {
  const suggestion = closestFlag(key);
  throw new Error(
    `Flag desconhecida: --${key}.` +
      (suggestion ? ` Você quis dizer --${suggestion}?` : "") +
      " Rode com --help para ver todas.",
  );
}

export function parseArguments(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      const text = cleanArgumentValue(argument);
      if (!text) continue;
      if (parsed.task) {
        throw new Error(
          "Só um texto solto é aceito como tarefa. Use aspas em volta da frase inteira.",
        );
      }
      parsed.task = text;
      continue;
    }

    const key = cleanArgumentValue(argument.slice(2));
    if (!KNOWN_FLAGS.has(key)) rejectUnknownFlag(key);
    if (key === "help") {
      parsed.help = true;
      continue;
    }
    if (
      key === "dry-run" ||
      key === "plan-only" ||
      key === "no-screen-test" ||
      key === "skip-service-check"
    ) {
      parsed[key] = true;
      continue;
    }

    const raw = argv[index + 1];
    if (!raw || raw.startsWith("--")) {
      throw new Error(`Valor ausente para --${key}.`);
    }
    const value = cleanArgumentValue(raw);
    if (!value) {
      throw new Error(`Valor de --${key} ficou vazio depois de limpar caracteres de controle.`);
    }

    if (parsed[key] === undefined) {
      parsed[key] = value;
    } else if (Array.isArray(parsed[key])) {
      parsed[key].push(value);
    } else {
      parsed[key] = [parsed[key], value];
    }
    index += 1;
  }

  return parsed;
}

/** Run de cron/launchd não carrega ~/.zshrc: sem PATH do nvm, sem ANDROID_HOME,
 *  sem JAVA_HOME. Endurece o ambiente a partir de fatos do próprio processo e
 *  de caminhos padrão, sem sobrescrever o que já estiver definido. */
export function hardenEnvironment(
  appEnv = {},
  env = process.env,
  home = os.homedir(),
) {
  for (const [key, value] of Object.entries(appEnv)) {
    if (typeof value === "string" && !env[key]) env[key] = value;
  }
  if (!env.ANDROID_HOME) {
    const sdk = path.join(home, "Library", "Android", "sdk");
    if (existsSync(sdk)) env.ANDROID_HOME = sdk;
  }
  if (!env.JAVA_HOME) {
    const jbr = "/Applications/Android Studio.app/Contents/jbr/Contents/Home";
    if (existsSync(jbr)) env.JAVA_HOME = jbr;
  }
  const additions = [path.dirname(process.execPath)];
  if (env.ANDROID_HOME) {
    additions.push(
      path.join(env.ANDROID_HOME, "platform-tools"),
      path.join(env.ANDROID_HOME, "emulator"),
    );
  }
  const current = (env.PATH ?? "").split(path.delimiter).filter(Boolean);
  env.PATH = [...new Set([...additions, ...current])].join(path.delimiter);
  return env;
}

const DEVICE_STATES = new Set(["limpo", "manter"]);

export function parseDeviceState(value, fallback = "manter") {
  if (!value) return fallback;
  if (!DEVICE_STATES.has(value)) {
    throw new Error('--device-state deve ser "limpo" ou "manter".');
  }
  return value;
}

export function parseQueueEntryName(value) {
  const separator = value.lastIndexOf(":");
  if (separator === -1) return { name: value, deviceState: null };
  const candidate = value.slice(separator + 1);
  if (!DEVICE_STATES.has(candidate)) return { name: value, deviceState: null };
  return { name: value.slice(0, separator), deviceState: candidate };
}

export function parseQueueNames(value) {
  if (!value) return [];
  return []
    .concat(value)
    .flatMap((item) => String(item).split(","))
    .map((name) => name.trim())
    .filter(Boolean);
}

async function readTextArgument(args, directKey, fileKey) {
  if (args[directKey] && args[fileKey]) {
    throw new Error(`Use apenas --${directKey} ou --${fileKey}.`);
  }

  if (args[fileKey]) {
    return (await readFile(path.resolve(args[fileKey]), "utf8")).trim();
  }

  return args[directKey]?.trim() ?? "";
}

/** Caminhos podem ser digitados de qualquer pasta: tenta a partir do diretório
 *  atual e, se não existir, a partir da raiz do orquestrador — é lá que ficam
 *  runs/, apps/ e examples/. */
function resolveInputPath(value) {
  if (!value) return value;
  const fromCwd = path.resolve(value);
  if (existsSync(fromCwd) || path.isAbsolute(value)) return fromCwd;
  const fromRoot = path.resolve(orchestratorRoot, value);
  return existsSync(fromRoot) ? fromRoot : fromCwd;
}

async function loadResumeState(file) {
  const state = JSON.parse(await readFile(resolveInputPath(file), "utf8"));
  if (!state.projectPath || !state.task) {
    throw new Error(`${file} não parece um estado de execução do orquestrador.`);
  }
  return state;
}

async function configFromArguments(args) {
  const resumed = args.resume ? await loadResumeState(args.resume) : null;
  if (!args.project && !resumed) {
    throw new Error("Informe --project com o caminho da pasta do app React Native.");
  }

  const projectPath = assertNotOrchestrator(
    path.resolve(args.project ?? resumed.projectPath),
  );
  const app = await loadProjectConfig(projectPath);
  hardenEnvironment(app?.env ?? {});
  await access(projectPath);
  const detected = await detectReactNativeProject(projectPath);
  // Tarefa de release ou de documentação não passa pela tela: sem device, o loop
  // não constrói, não instala e não espera Metro por evidência que ninguém vai ler.
  const noScreenTest = Boolean(args["no-screen-test"]);
  const androidPackage = noScreenTest
    ? null
    : (args["android-package"] ?? app?.androidPackage ?? null);

  const queueNames = parseQueueNames(args.queue);
  if (queueNames.length) {
    const conflicting = [
      "task",
      "task-file",
      "tasks",
      "resume",
      "plan-only",
      "acceptance",
      "acceptance-file",
    ].find((key) => args[key]);
    if (conflicting) {
      throw new Error(
        `--queue não combina com --${conflicting}: a fila já define as tarefas ` +
          "(e os critérios pelo par <nome>.aceitacao.md) e commita entre elas.",
      );
    }
  }
  const queue = [];
  for (const rawName of queueNames) {
    const { name, deviceState: entryDeviceState } = parseQueueEntryName(rawName);
    const resolved = resolveTaskFile(name, app);
    let text;
    try {
      text = (await readFile(resolved.taskFile, "utf8")).trim();
    } catch {
      throw new Error(
        `Tarefa da fila não encontrada: "${name}". Use um caminho de arquivo ou um ` +
          "nome curto que exista em apps/<nome-da-pasta>/tarefas/<nome>.md.",
      );
    }
    if (!text) throw new Error(`Tarefa da fila está vazia: "${name}".`);
    const acceptanceText = resolved.acceptanceFile
      ? (await readFile(resolved.acceptanceFile, "utf8")).trim()
      : `A feature deve cumprir integralmente esta tarefa:\n${text}`;
    queue.push({
      name,
      taskFile: resolved.taskFile,
      task: text,
      acceptanceCriteria: acceptanceText,
      deviceState: entryDeviceState,
    });
  }

  const named = resolveTaskFile(args["task-file"], app);
  if (named.taskFile) args["task-file"] = named.taskFile;
  if (named.acceptanceFile && !args.acceptance && !args["acceptance-file"]) {
    args["acceptance-file"] = named.acceptanceFile;
  }
  const provider = args.provider ?? resumed?.provider ?? app?.provider ?? "codex";
  validateProvider(provider);

  const repeatedTasks = Array.isArray(args.task) ? args.task : null;
  const task =
    args.tasks || repeatedTasks
      ? ""
      : (await readTextArgument(args, "task", "task-file")) || resumed?.task || "";
  if (!task && !args.tasks && !repeatedTasks && !queue.length) {
    throw new Error("Informe --task, --task-file, --tasks, --queue ou --resume.");
  }

  const acceptanceCriteria =
    (await readTextArgument(args, "acceptance", "acceptance-file")) ||
    resumed?.acceptanceCriteria ||
    (task ? `A feature deve cumprir integralmente esta tarefa:\n${task}` : "");
  const profile = resolveProfile(args.profile ?? app?.profile);
  const designReasoningEffort =
    args["design-reasoning"] ??
    args.reasoning ??
    profile?.designReasoningEffort ??
    "high";
  const codeReasoningEffort =
    args["code-reasoning"] ?? args.reasoning ?? profile?.codeReasoningEffort ?? "low";
  validateReasoningEffort(designReasoningEffort, provider);
  validateReasoningEffort(codeReasoningEffort, provider);

  const escalationModel =
    args["escalation-model"] ??
    app?.escalationModel ??
    (provider === "claude" ? "opus" : "");
  const escalationReasoning =
    args["escalation-reasoning"] ??
    app?.escalationReasoning ??
    (provider === "claude" ? "max" : "xhigh");
  const escalation =
    escalationModel && escalationModel !== "none"
      ? { model: escalationModel, reasoningEffort: escalationReasoning }
      : null;
  if (escalation) validateReasoningEffort(escalation.reasoningEffort, provider);

  const marketingMode =
    args["marketing-mode"] ?? app?.marketingMode ?? profile?.marketingMode ?? "none";
  if (!["none", "context", "full"].includes(marketingMode)) {
    throw new Error("--marketing-mode deve ser none, context ou full.");
  }
  if (marketingMode === "full" && !androidPackage) {
    throw new Error("--marketing-mode full exige --android-package.");
  }
  if (args["adb-steps"] && !androidPackage) {
    throw new Error("--adb-steps exige --android-package.");
  }

  const tasksFile = typeof args.tasks === "string" ? args.tasks : "";
  if (tasksFile && args.task) {
    throw new Error("Use --task ou --tasks, não os dois.");
  }
  const batchMode = Boolean(tasksFile || repeatedTasks);
  if (batchMode && args["android-package"] && !args["build-command"]) {
    throw new Error(
      "No lote com Android, --build-command é obrigatório: sem build por worktree o " +
        "tester validaria o APK instalado por outra tarefa. Veja --help para o comando sugerido.",
    );
  }

  return {
    dryRun: Boolean(args["dry-run"]),
    resumeFile: args.resume ? resolveInputPath(args.resume) : "",
    retries: parseRetries(args.retries),
    waitMs: parseWaitMinutes(args.wait),
    metroPort: Number.parseInt(args["metro-port"] ?? "8081", 10),
    skipServiceCheck: Boolean(args["skip-service-check"]),
    resumedBrief: resumed?.designBrief ?? null,
    resumedFeedback: resumed?.lastFeedback ?? "",
    resumedMarket: resumed?.marketAnalysis ?? null,
    resumedSessions: resumed?.sessionIds ?? resumed?.threadIds ?? null,
    rawArgv: process.argv.slice(2),
    planOnly: Boolean(args["plan-only"]),
    inlineTasks: repeatedTasks,
    marketCacheDays: Number.parseInt(args["market-cache-days"] ?? "7", 10),
    appRules: app ? await loadAppRules(app) : "",
    profileName: args.profile ?? app?.profile ?? null,
    appName: app?.exists ? app.name : null,
    taskFile: args["task-file"] ?? "",
    gateOverrides: noScreenTest
      ? {
          ...(profile?.gateOverrides ?? {}),
          screenTest: false,
          designCheck: false,
          uxAudit: false,
        }
      : (profile?.gateOverrides ?? {}),
    tasksFile: tasksFile ? resolveInputPath(tasksFile) : "",
    queue,
    concurrency: parseConcurrency(args.concurrency),
    baseRef: args["base-ref"] ?? "",
    buildCommand: args["build-command"] ?? app?.buildCommand ?? "",
    worktreesDirectory: args.worktrees
      ? path.resolve(args.worktrees)
      : path.join(defaultWorktreesDirectory, path.basename(projectPath)),
    provider,
    projectPath,
    task,
    acceptanceCriteria,
    maxCycles: parseMaxCycles(args["max-cycles"] ?? profile?.maxCycles?.toString()),
    agentTimeoutMs: parseAgentTimeout(args["agent-timeout"]),
    model: args.model ?? "",
    auxiliaryModel: args["aux-model"] ?? app?.auxModel ?? "",
    escalation,
    tokenBudget: parseTokenBudget(args["token-budget"] ?? app?.tokenBudget),
    deviceState: parseDeviceState(args["device-state"] ?? app?.deviceState),
    designReasoningEffort,
    codeReasoningEffort,
    android: androidPackage
      ? {
          packageName: androidPackage,
          activity:
            args["android-activity"] ?? app?.androidActivity ?? detected.activity,
          deviceId: args["adb-device"] ?? app?.adbDevice ?? "",
          stepsFile: args["adb-steps"]
            ? resolveInputPath(args["adb-steps"])
            : (app?.adbSteps ?? ""),
        }
      : null,
    marketing: {
      mode: marketingMode,
      appContext: {
        appName: detected.appName,
        packageName: androidPackage ?? detected.packageCandidates[0]?.value ?? null,
        category: args["app-category"] ?? app?.appCategory ?? null,
      },
      competitors: (args.competitors ?? app?.competitors ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    },
    detected,
  };
}

function runtimeFactory(config, sessionIds = config.resumedSessions) {
  return ({ projectPath }) =>
    createAgentRuntime({
      provider: config.provider,
      projectPath,
      sessionIds: sessionIds ?? undefined,
      threadIds: sessionIds ?? undefined,
      model: config.model || undefined,
      auxiliaryModel: config.auxiliaryModel || undefined,
      designReasoningEffort: config.designReasoningEffort,
      codeReasoningEffort: config.codeReasoningEffort,
      agentTimeoutMs: config.agentTimeoutMs,
    });
}

function escalationRuntimeFactory(config) {
  if (!config.escalation) return null;
  return ({ projectPath }) =>
    createAgentRuntime({
      provider: config.provider,
      projectPath,
      model: config.escalation.model,
      auxiliaryModel: config.escalation.model,
      designReasoningEffort: config.escalation.reasoningEffort,
      codeReasoningEffort: config.escalation.reasoningEffort,
      agentTimeoutMs: config.agentTimeoutMs,
    });
}

async function loadAdbSteps(config) {
  if (!config.android?.stepsFile) return [];
  const stepsText = await readFile(path.resolve(config.android.stepsFile), "utf8");
  return JSON.parse(stepsText);
}

function screenDriverFactory(config, steps) {
  if (!config.android) return () => null;
  const infraWaitMs = Math.max(config.waitMs ?? 0, 10 * 60_000);
  const onWait = (why) =>
    console.log(
      hintLine(
        `${why}. Esperando até ${Math.round(infraWaitMs / 60_000)} min antes de tentar de novo.`,
      ),
    );
  return ({ projectPath, artifactsDirectory, lock }) =>
    new AndroidTestDriver({
      packageName: config.android.packageName,
      activity: config.android.activity,
      deviceId: config.android.deviceId || undefined,
      steps,
      artifactsDirectory,
      projectPath,
      buildCommand: config.buildCommand || undefined,
      deviceState: config.deviceState ?? "manter",
      lock,
      waitForServices: async () => {
        await waitForDevice({
          deviceId: config.android.deviceId || undefined,
          waitMs: infraWaitMs,
          onWait,
        });
        await waitForMetro({
          port: config.metroPort ?? 8081,
          waitMs: infraWaitMs,
          onWait,
        });
      },
      onInfraRetry: ({ attempt, retries, message }) =>
        console.log(
          hintLine(
            `Coleta de evidência falhou (${attempt}/${retries}): ${message}. ` +
              "Esperando device e Metro para tentar de novo.",
          ),
        ),
    });
}

function printHeader(config, extra = []) {
  const rows = [
    ["Projeto", config.projectPath],
    ["Provedor", config.provider === "claude" ? "Claude Code" : "Codex"],
    ["Perfil", config.profileName ?? "nenhum"],
    ...(config.appName ? [["Config", config.appName]] : []),
    ...(config.taskFile ? [["Tarefa", config.taskFile]] : []),
    ...(config.appRules ? [["Regras", `${config.appRules.split("\n").length} linhas fixas`]] : []),
    ["Mercado", config.marketing.mode],
    ["Ciclos", String(config.maxCycles)],
    ["Reasoning", `design ${config.designReasoningEffort} / codigo ${config.codeReasoningEffort}`],
    ["Timeout", `${Math.round(config.agentTimeoutMs / 60_000)} min por agente`],
    [
      "Fallback",
      config.escalation
        ? `${config.escalation.model} (${config.escalation.reasoningEffort}) quando um agente travar`
        : "desligado",
    ],
    [
      "Teto",
      config.tokenBudget
        ? `${config.tokenBudget.toLocaleString("pt-BR")} tokens por run`
        : "sem teto de tokens",
    ],
    ...(config.android
      ? [
          ["Android", config.android.packageName],
          ["Device", `estado inicial ${config.deviceState ?? "manter"}`],
        ]
      : []),
    ...extra,
  ];
  console.log(rule("configuracao"));
  for (const [label, value] of rows) {
    console.log(`${style.gray(label.padEnd(11))}${value}`);
  }
}

function printGates(config) {
  const overrides = config.gateOverrides ?? {};
  const describe = (value) =>
    value === true
      ? style.green("sempre")
      : value === false
        ? style.gray("nunca")
        : style.yellow("o brief decide");
  console.log(
    `${style.gray("Gates".padEnd(11))}tela ${describe(overrides.screenTest)} · ` +
      `design ${describe(overrides.designCheck)} · ux ${describe(overrides.uxAudit)} · ` +
      `codigo ${describe(overrides.codeReview)}`,
  );
}

function printAuthWarning(config) {
  const auth = checkProviderAuth(config.provider);
  if (auth.ok) {
    console.log(`${style.gray("Credencial".padEnd(11))}${auth.source}`);
    return;
  }
  console.log(`${style.gray("Credencial".padEnd(11))}${style.yellow("nao encontrada")}`);
  console.log(hintLine(auth.hint));
}

function printFailureHint(...messages) {
  for (const message of messages) {
    const hint = explainAgentError(message);
    if (hint) {
      console.log(hintLine(hint));
      return;
    }
  }
}

function resumeCommand(config, stateFile) {
  const quote = (value) => (/[\s"']/.test(value) ? JSON.stringify(value) : value);
  const parts = ["orquestrar-features", "--resume", quote(stateFile)];
  if (config.profileName) parts.push("--profile", config.profileName);
  if (config.taskFile) parts.push("--task-file", quote(config.taskFile));
  return parts.join(" ");
}

async function ensureServices(config) {
  if (!config.android || config.skipServiceCheck) return;

  const onWait = (why) =>
    console.log(
      hintLine(
        `${why}. Esperando até ${Math.round((config.waitMs ?? 0) / 60_000)} min.`,
      ),
    );

  const device = await waitForDevice({
    deviceId: config.android.deviceId || undefined,
    waitMs: config.waitMs ?? 0,
    onWait,
  });
  console.log(
    `${style.gray("Device".padEnd(11))}${device.devices?.join(", ") ?? config.android.deviceId}`,
  );

  await waitForMetro({
    port: config.metroPort ?? 8081,
    waitMs: config.waitMs ?? 0,
    onWait,
  });
  console.log(`${style.gray("Metro".padEnd(11))}porta ${config.metroPort ?? 8081}`);
}

async function runOnce(
  config,
  { sessionIds, designBrief, printEvent, resumedFeedback },
) {
  const runtime = await runtimeFactory(config, sessionIds)({
    projectPath: config.projectPath,
  });
  const stateStore = new JsonRunStateStore();
  const steps = await loadAdbSteps(config);
  const screenTestDriver = screenDriverFactory(config, steps)({
    projectPath: config.projectPath,
    artifactsDirectory: path.join(
      stateStore.runsDirectory,
      `${stateStore.runId}-artifacts`,
    ),
    lock: (operation) => operation(),
  });

  const marketAnalysis = await resolveMarketAnalysis(config, printEvent);

  const result = await runFeatureLoop({
    runtime,
    projectPath: config.projectPath,
    task: config.task,
    acceptanceCriteria: config.acceptanceCriteria,
    maxCycles: config.maxCycles,
    stateStore,
    screenTestDriver,
    marketing: config.marketing,
    marketAnalysis,
    designBrief,
    resumedFeedback: resumedFeedback ?? config.resumedFeedback ?? "",
    tokenBudget: config.tokenBudget ?? 0,
    appRules: config.appRules ?? "",
    gateOverrides: config.gateOverrides ?? {},
    planOnly: config.planOnly ?? false,
    createEscalationRuntime: (() => {
      const factory = escalationRuntimeFactory(config);
      return factory
        ? () => factory({ projectPath: config.projectPath })
        : null;
    })(),
    onEvent: printEvent,
  });

  return { result, stateFile: stateStore.filePath };
}

async function runSingle(config) {
  const printEvent = createPrinter({ batch: false });

  printHeader(config);
  printGates(config);
  printAuthWarning(config);
  if (config.resumeFile) {
    console.log(`${style.gray("Retomando".padEnd(11))}${config.resumeFile}`);
  }
  if (config.dryRun) {
    console.log(`\n${style.yellow("--dry-run: nada foi executado.")}`);
    return;
  }

  await ensureServices(config);

  let sessionIds = config.resumedSessions ?? null;
  let designBrief = config.resumedBrief ?? null;
  let resumedFeedback = config.resumedFeedback ?? "";
  let attempt = 0;
  let rateWaitMs = 0;
  let outcome;

  while (true) {
    outcome = await runOnce(config, {
      sessionIds,
      designBrief,
      printEvent,
      resumedFeedback,
    });
    const { result, stateFile } = outcome;

    console.log(rule(attempt ? `resultado da tentativa ${attempt + 1}` : "resultado"));
    console.log(
      `${statusStyle(result.finalStatus)(style.bold(result.finalStatus))} ${style.gray(result.stopReason ?? "")}`,
    );
    console.log(`${style.gray("Ciclos".padEnd(11))}${result.cycles.length}`);
    console.log(
      `${style.gray("Tokens".padEnd(11))}entrada ${result.usage.inputTokens} · cache ${result.usage.cachedInputTokens} · saida ${result.usage.outputTokens} · reasoning ${result.usage.reasoningOutputTokens}`,
    );
    console.log(`${style.gray("Estado".padEnd(11))}${stateFile}`);

    if (result.finalStatus === "PASS") break;

    printFailureHint(
      result.designBrief?.summary,
      result.marketAnalysis?.summary,
      result.cycles?.at(-1)?.implementation?.summary,
      result.stopReason,
    );

    const verdict = classifyOutcome(result);

    // Limite de uso renova sozinho (janela de horas): esperar não consome
    // retry — repete até voltar, com teto de 6h de espera acumulada.
    if (verdict.retry && verdict.waitMs) {
      rateWaitMs += verdict.waitMs;
      if (rateWaitMs <= 6 * 60 * 60_000) {
        console.log(
          hintLine(
            `Limite de uso do provedor: esperando ${Math.round(verdict.waitMs / 60_000)} min ` +
              `pela renovação (acumulado ${Math.round(rateWaitMs / 60_000)} min) e retomando sozinho.`,
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, verdict.waitMs));
        sessionIds = result.sessionIds ?? sessionIds;
        designBrief = result.designBrief ?? designBrief;
        resumedFeedback = result.lastFeedback ?? resumedFeedback;
        continue;
      }
      console.log(hintLine("Limite de uso não renovou em 6h; parando retomável."));
    }

    if (!verdict.retry || attempt >= config.retries) {
      console.log(
        `${style.gray("Retomar".padEnd(11))}${style.bold(resumeCommand(config, stateFile))}`,
      );
      if (!verdict.retry && config.retries) {
        console.log(hintLine(`Não retomei sozinho: ${verdict.why}.`));
      }
      break;
    }

    attempt += 1;
    console.log(
      hintLine(`Retomando sozinho (${attempt}/${config.retries}): ${verdict.why}.`),
    );
    sessionIds = result.sessionIds ?? sessionIds;
    designBrief = result.designBrief ?? designBrief;
    resumedFeedback = result.lastFeedback ?? resumedFeedback;
  }

  const status = outcome.result.finalStatus;
  if (status === "BLOCKED") process.exitCode = 2;
  else if (status !== "PASS") process.exitCode = 3;
  return status;
}

async function runQueue(config) {
  console.log(rule("fila sequencial"));
  config.queue.forEach((entry, index) =>
    console.log(`${style.gray(String(index + 1).padEnd(11))}${entry.name}`),
  );

  if (config.dryRun) {
    console.log(`\n${style.yellow("--dry-run: nada foi executado.")}`);
    return;
  }

  if (await repositoryDirty(config.projectPath)) {
    throw new Error(
      "A fila commita cada tarefa aprovada, então o projeto precisa começar limpo: " +
        "commite ou faça stash das alterações pendentes. Sugestão: crie uma branch " +
        "antes (git switch -c <nome>) para revisar tudo de manhã.",
    );
  }

  for (const [index, entry] of config.queue.entries()) {
    console.log(rule(`fila ${index + 1}/${config.queue.length}: ${entry.name}`));
    const status = await runSingle({
      ...config,
      queue: [],
      task: entry.task,
      acceptanceCriteria: entry.acceptanceCriteria,
      taskFile: entry.taskFile,
      deviceState: entry.deviceState ?? config.deviceState ?? "manter",
    });

    if (status !== "PASS") {
      const remaining = config.queue.slice(index + 1).map((item) => item.name);
      console.log(
        hintLine(
          `Fila parada em "${entry.name}".` +
            (remaining.length
              ? ` Depois de resolver e commitar, rode --queue ${remaining.join(",")} para o restante.`
              : ""),
        ),
      );
      return;
    }

    const commit = await commitWorktree(
      config.projectPath,
      commitMessage(entry.task),
    );
    console.log(
      `${style.gray("Commit".padEnd(11))}${commit ?? "nada a commitar"} ${style.gray(`(${entry.name})`)}`,
    );
  }

  console.log(rule("fila concluida"));
}

async function loadTasks(config) {
  const raw = config.inlineTasks ?? (await readFile(config.tasksFile, "utf8"));
  return parseTaskList(
    raw,
    (task) => config.acceptanceCriteria || `A feature deve cumprir integralmente esta tarefa:\n${task}`,
  );
}

async function resolveMarketAnalysis(config, printEvent) {
  if (config.marketing.mode === "none") return null;

  const directory = path.join(new JsonRunStateStore().runsDirectory, "market-cache");
  const cached = await readMarketCache({
    directory,
    appContext: config.marketing.appContext,
    maxAgeDays: config.marketCacheDays,
  });
  if (cached) {
    printEvent({ type: "marketing.reused", result: cached.analysis });
    const days = Math.round(cached.ageDays);
    console.log(
      `${style.gray("Cache".padEnd(11))}pesquisa de mercado ${
        days < 1 ? "de hoje" : `de ${days} dia(s) atrás`
      } reaproveitada`,
    );
    return cached.analysis;
  }

  printEvent({ type: "marketing.started" });
  const runtime = await runtimeFactory(config)({ projectPath: config.projectPath });
  try {
    const analysis = await runtime.runMarketAnalysis(
      {
        task: config.marketing.appContext.appName
          ? `Melhorias no app ${config.marketing.appContext.appName}`
          : "Melhorias no app",
        acceptanceCriteria:
          "Evidência utilizável para decidir features, copy e monetização.",
        appContext: config.marketing.appContext,
        competitors: config.marketing.competitors,
      },
      {
        onProgress: (progress) =>
          printEvent({ type: "agent.progress", agent: "market_analyst", ...progress }),
      },
    );
    printEvent({ type: "marketing.completed", result: analysis });
    await writeMarketCache({
      directory,
      appContext: config.marketing.appContext,
      analysis,
    });
    return analysis;
  } catch (error) {
    console.log(
      `${style.gray("Mercado".padEnd(11))}${style.yellow(`pesquisa falhou (${error.message}); seguindo sem contexto`)}`,
    );
    return null;
  }
}

async function runTasksBatch(config) {
  const printEvent = createPrinter({ batch: true });
  let dirtyWarning = "";
  if (!config.baseRef) {
    try {
      await assertCleanRepository(config.projectPath);
    } catch (error) {
      if (!config.dryRun) throw error;
      dirtyWarning = error.message;
    }
  }
  const baseRef = await resolveBaseRef(config.projectPath, config.baseRef || "HEAD");
  const tasks = await loadTasks(config);
  const steps = await loadAdbSteps(config);
  const reportStore = new JsonRunStateStore();

  printHeader(config, [
    ["Tarefas", `${tasks.length} (${config.concurrency} em paralelo)`],
    ["Base", baseRef.slice(0, 12)],
    ["Worktrees", config.worktreesDirectory],
    ...(config.buildCommand ? [["Build", config.buildCommand]] : []),
  ]);
  printGates(config);
  printAuthWarning(config);
  console.log(rule("tarefas"));
  tasks.forEach((entry, index) => {
    console.log(`${style.gray(String(index + 1).padStart(2))}  ${entry.task}`);
  });

  if (config.dryRun) {
    if (dirtyWarning) console.log(`\n${style.yellow(dirtyWarning)}`);
    console.log(`\n${style.yellow("--dry-run: nada foi executado.")}`);
    return;
  }
  if (config.android && config.buildCommand) {
    console.log(
      style.gray("Device serializado: build, install e captura rodam uma tarefa por vez."),
    );
  }
  await ensureServices(config);

  const marketAnalysis = await resolveMarketAnalysis(config, printEvent);

  const { results, startedAt, finishedAt } = await runBatch({
    repositoryPath: config.projectPath,
    tasks,
    baseRef,
    worktreesDirectory: config.worktreesDirectory,
    concurrency: config.concurrency,
    maxCycles: config.maxCycles,
    marketing: config.marketing,
    marketAnalysis,
    appRules: config.appRules ?? "",
    gateOverrides: config.gateOverrides ?? {},
    createRuntime: runtimeFactory(config),
    createStateStore: () => new JsonRunStateStore(),
    createScreenDriver: screenDriverFactory(config, steps),
    createEscalationRuntime: escalationRuntimeFactory(config),
    tokenBudget: config.tokenBudget ?? 0,
    onEvent: printEvent,
  });

  const reportPath = path.join(
    reportStore.runsDirectory,
    `lote-${reportStore.runId}.html`,
  );
  await writeBatchReport(
    reportPath,
    await buildBatchReport({ results, startedAt, finishedAt }),
  );

  console.log(rule("resumo do lote"));
  for (const result of results) {
    const status = result.error ? "ERROR" : (result.state?.finalStatus ?? "ERROR");
    console.log(
      `${statusStyle(status)(style.bold(status.padEnd(8)))} ${result.slug.padEnd(24)} ${style.gray(result.branch ?? "sem worktree")}`,
    );
  }
  console.log(`\n${style.bold("Relatorio:")} ${reportPath}`);

  const failures = results.filter(
    (result) => result.error || result.state?.finalStatus !== "PASS",
  );
  if (failures.length) process.exitCode = 3;
}

function lockKeysFor(config) {
  return [
    `projeto-${config.projectPath}`,
    config.android ? `device-${config.android.deviceId || "adb-padrao"}` : null,
  ];
}

async function printLockHolders(config) {
  for (const key of lockKeysFor(config).filter(Boolean)) {
    const holder = await readHolder(key);
    if (holder) {
      console.log(
        `${style.gray("Em uso".padEnd(11))}${key} — ${describeHolder(holder)}`,
      );
    }
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const args = argv.length ? parseArguments(argv) : null;
  if (args?.help) {
    printHelp();
    return;
  }
  const config = args
    ? await configFromArguments(args)
    : await runInteractiveWizard();
  validateProvider(config.provider);
  validateReasoningEffort(config.designReasoningEffort, config.provider);
  validateReasoningEffort(config.codeReasoningEffort, config.provider);

  const run = () =>
    config.queue?.length
      ? runQueue(config)
      : config.tasksFile || config.inlineTasks
        ? runTasksBatch(config)
        : runSingle(config);

  if (config.dryRun) {
    await printLockHolders(config);
    await run();
    return;
  }

  await withLocks(
    lockKeysFor(config),
    {
      task: (
        config.task ||
        config.tasksFile ||
        (config.queue?.length
          ? `fila: ${config.queue.map((entry) => entry.name).join(", ")}`
          : "lote")
      ).slice(0, 80),
    },
    { waitMs: config.waitMs ?? 0 },
    run,
  );
}

function isEntryPoint() {
  const entry = process.argv[1];
  if (!entry) return false;
  const modulePath = fileURLToPath(import.meta.url);
  const resolve = (value) => {
    try {
      return realpathSync(value);
    } catch {
      return path.resolve(value);
    }
  };
  return resolve(entry) === resolve(modulePath);
}

const invokedDirectly = isEntryPoint();

if (invokedDirectly) {
  main().catch((error) => {
    console.error(`Erro: ${error.message}`);
    process.exitCode = 1;
  });
}
