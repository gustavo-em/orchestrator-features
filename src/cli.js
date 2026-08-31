#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { AndroidTestDriver } from "./android-test-driver.js";
import { runFeatureLoop } from "./orchestrator.js";
import { detectReactNativeProject } from "./project-detector.js";
import { createAgentRuntime, validateProvider } from "./runtime-factory.js";
import { JsonRunStateStore } from "./state-store.js";
import { runInteractiveWizard } from "./wizard.js";

function printHelp() {
  console.log(`
Uso:
  orquestrar-features
  npm start

Modo automatizado:
  npm start -- --project /caminho/do/app --task "Descrição da feature"

Opções:
  --project <caminho>          Projeto React Native que será modificado.
  --task <texto>               Tarefa a implementar.
  --task-file <arquivo>        Lê a tarefa de um arquivo.
  --acceptance <texto>         Critérios de aceitação.
  --acceptance-file <arquivo>  Lê os critérios de um arquivo.
  --provider <nome>            codex ou claude. Padrão: codex.
  --max-cycles <1-10>          Limite do loop. Padrão: 3.
  --android-package <id>       Ativa tester Android. Ex.: com.exemplo.app.
  --android-activity <nome>    Activity inicial. Padrão: .MainActivity.
  --adb-device <serial>        Device específico quando houver mais de um.
  --adb-steps <arquivo.json>   Passos ADB determinísticos antes da captura.
  --marketing-mode <modo>      none, context ou full. Padrão com flags: none.
  --app-category <texto>       Categoria ou público para análise de mercado.
  --competitors <lista>        Nomes/URLs separados por vírgula.
  --agent-timeout <1-60>       Timeout base; implementação recebe no mínimo 30 min. Padrão: 10.
  --model <id>                 Modelo do provedor. Omita para usar o padrão configurado.
  --aux-model <id>             Modelo opcional para tester e revisores.
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

function parseAgentTimeout(value) {
  const minutes = Number.parseInt(value ?? "10", 10);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
    throw new Error("--agent-timeout deve ser número entre 1 e 60.");
  }
  return minutes * 60_000;
}

function parseArguments(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      throw new Error(`Argumento inesperado: ${argument}`);
    }

    const key = argument.slice(2);
    if (key === "help") {
      parsed.help = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Valor ausente para --${key}.`);
    }

    parsed[key] = value;
    index += 1;
  }

  return parsed;
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

function printEvent(event) {
  if (event.type === "marketing.started") {
    console.log("\nmarket_analyst: pesquisando concorrentes e contexto");
  } else if (event.type === "marketing.completed") {
    console.log(`Mercado: ${event.result.status} — ${event.result.summary}`);
  } else if (event.type === "lead.planning.started") {
    console.log("\nfeature_lead: entendendo projeto e definindo brief");
  } else if (event.type === "lead.planning.completed") {
    console.log(`Brief: ${event.result.status} — ${event.result.summary}`);
    if (event.result.routeSummary) console.log(`Rota: ${event.result.routeSummary}`);
  } else if (event.type === "lead.planning.continuation.started") {
    console.log("  feature_lead: encerrando inspeção e emitindo brief");
  } else if (event.type === "lead.revision.started") {
    console.log("feature_lead: revisando brief por achado material");
  } else if (event.type === "lead.revision.completed") {
    console.log(`Novo brief: ${event.result.status} — ${event.result.summary}`);
  } else if (event.type === "cycle.started") {
    console.log(`\nCiclo ${event.cycle}: feature_lead implementando`);
  } else if (event.type === "implementation.completed") {
    console.log(`Implementação: ${event.result.summary}`);
  } else if (event.type === "implementation.continuation.started") {
    console.log("  feature_lead: limite atingido; continuando na mesma thread");
  } else if (event.type === "implementation.continuation.completed") {
    console.log(`  Continuação: ${event.result.status} — ${event.result.summary}`);
  } else if (event.type === "tester.started") {
    console.log(`Ciclo ${event.cycle}: tester`);
  } else if (event.type === "tester.completed") {
    console.log(`Tela: ${event.result.status} — ${event.result.summary}`);
  } else if (event.type === "code_review.started") {
    console.log(`Ciclo ${event.cycle}: code_reviewer`);
  } else if (event.type === "code_review.completed") {
    console.log(`Código: ${event.result.status} — ${event.result.summary}`);
  } else if (event.type === "audit.started") {
    console.log(`Ciclo ${event.cycle}: ux_auditor`);
  } else if (event.type === "audit.completed") {
    console.log(`Auditoria: ${event.result.status} — ${event.result.summary}`);
  } else if (event.type === "agent.progress") {
    const elapsed =
      event.elapsedSeconds < 60
        ? `${event.elapsedSeconds}s`
        : `${Math.floor(event.elapsedSeconds / 60)}m ${event.elapsedSeconds % 60}s`;
    if (event.kind === "heartbeat") {
      console.log(`  ${event.agent}: trabalhando (${elapsed})`);
    } else if (
      event.detail.startsWith("arquivos atualizados") ||
      event.detail === "pesquisa web" ||
      event.detail === "erro reportado"
    ) {
      console.log(`  ${event.agent}: ${event.detail}`);
    }
  }
}

async function configFromArguments(args) {
  if (!args.project) {
    throw new Error("Informe --project com o caminho do app React Native.");
  }

  const projectPath = path.resolve(args.project);
  await access(projectPath);
  const detected = await detectReactNativeProject(projectPath);
  const provider = args.provider ?? "codex";
  validateProvider(provider);

  const task = await readTextArgument(args, "task", "task-file");
  if (!task) throw new Error("Informe --task ou --task-file.");

  const acceptanceCriteria =
    (await readTextArgument(args, "acceptance", "acceptance-file")) ||
    `A feature deve cumprir integralmente esta tarefa:\n${task}`;
  const designReasoningEffort =
    args["design-reasoning"] ?? args.reasoning ?? "high";
  const codeReasoningEffort =
    args["code-reasoning"] ?? args.reasoning ?? "low";
  validateReasoningEffort(designReasoningEffort, provider);
  validateReasoningEffort(codeReasoningEffort, provider);

  const marketingMode = args["marketing-mode"] ?? "none";
  if (!["none", "context", "full"].includes(marketingMode)) {
    throw new Error("--marketing-mode deve ser none, context ou full.");
  }
  if (marketingMode === "full" && !args["android-package"]) {
    throw new Error("--marketing-mode full exige --android-package.");
  }
  if (args["adb-steps"] && !args["android-package"]) {
    throw new Error("--adb-steps exige --android-package.");
  }

  return {
    provider,
    projectPath,
    task,
    acceptanceCriteria,
    maxCycles: parseMaxCycles(args["max-cycles"]),
    agentTimeoutMs: parseAgentTimeout(args["agent-timeout"]),
    model: args.model ?? "",
    auxiliaryModel: args["aux-model"] ?? "",
    designReasoningEffort,
    codeReasoningEffort,
    android: args["android-package"]
      ? {
          packageName: args["android-package"],
          activity: args["android-activity"] ?? detected.activity,
          deviceId: args["adb-device"] ?? "",
          stepsFile: args["adb-steps"] ?? "",
        }
      : null,
    marketing: {
      mode: marketingMode,
      appContext: {
        appName: detected.appName,
        packageName:
          args["android-package"] ?? detected.packageCandidates[0]?.value ?? null,
        category: args["app-category"] ?? null,
      },
      competitors: (args.competitors ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    },
    detected,
  };
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

  const runtime = await createAgentRuntime({
    provider: config.provider,
    projectPath: config.projectPath,
    model: config.model || undefined,
    auxiliaryModel: config.auxiliaryModel || undefined,
    designReasoningEffort: config.designReasoningEffort,
    codeReasoningEffort: config.codeReasoningEffort,
    agentTimeoutMs: config.agentTimeoutMs,
  });
  const stateStore = new JsonRunStateStore();
  let screenTestDriver;

  if (config.android) {
    let steps = [];
    if (config.android.stepsFile) {
      const stepsText = await readFile(
        path.resolve(config.android.stepsFile),
        "utf8",
      );
      steps = JSON.parse(stepsText);
    }

    screenTestDriver = new AndroidTestDriver({
      packageName: config.android.packageName,
      activity: config.android.activity,
      deviceId: config.android.deviceId || undefined,
      steps,
      artifactsDirectory: path.join(
        stateStore.runsDirectory,
        `${stateStore.runId}-artifacts`,
      ),
    });
  }

  console.log(`Projeto: ${config.projectPath}`);
  console.log(`Provedor: ${config.provider === "claude" ? "Claude Code" : "Codex"}`);
  if (config.android) {
    console.log(`Android detectado: ${config.android.packageName}`);
  }
  console.log(`Marketing: ${config.marketing.mode}`);
  console.log(`Máximo de ciclos: ${config.maxCycles}`);
  console.log("Arquitetura: feature_lead persistente + especialistas sob demanda");
  console.log(
    `Reasoning do feature_lead: design ${config.designReasoningEffort} → código ${config.codeReasoningEffort}`,
  );
  console.log(`Timeout por agente: ${Math.round(config.agentTimeoutMs / 60_000)} min`);
  console.log(
    `Timeout de implementação: ${Math.max(Math.round(config.agentTimeoutMs / 60_000) * 3, 30)} min`,
  );

  const result = await runFeatureLoop({
    runtime,
    projectPath: config.projectPath,
    task: config.task,
    acceptanceCriteria: config.acceptanceCriteria,
    maxCycles: config.maxCycles,
    stateStore,
    screenTestDriver,
    marketing: config.marketing,
    onEvent: printEvent,
  });

  console.log(`\nResultado: ${result.finalStatus}`);
  console.log(`Motivo: ${result.stopReason}`);
  console.log(`Ciclos executados: ${result.cycles.length}`);
  console.log(
    `Tokens: entrada ${result.usage.inputTokens}, cache ${result.usage.cachedInputTokens}, saída ${result.usage.outputTokens}, reasoning ${result.usage.reasoningOutputTokens}`,
  );
  console.log(`Estado salvo em: ${stateStore.filePath}`);

  if (result.finalStatus === "BLOCKED") {
    process.exitCode = 2;
  } else if (result.finalStatus !== "PASS") {
    process.exitCode = 3;
  }
}

main().catch((error) => {
  console.error(`Erro: ${error.message}`);
  process.exitCode = 1;
});
