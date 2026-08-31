import { access } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

import { loadAppRules, loadProjectConfig } from "./app-config.js";
import { assertNotOrchestrator, orchestratorRoot } from "./paths.js";
import { profiles } from "./profiles.js";
import { detectReactNativeProject } from "./project-detector.js";

export class TerminalPrompter {
  constructor({ input = process.stdin, output = process.stdout } = {}) {
    this.output = output;
    this.readline = createInterface({ input, output });
  }

  async text(label, defaultValue = "") {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const answer = (await this.readline.question(`${label}${suffix}: `)).trim();
    return answer || defaultValue;
  }

  async confirm(label, defaultValue = true) {
    const hint = defaultValue ? "S/n" : "s/N";
    const answer = (await this.readline.question(`${label} (${hint}): `))
      .trim()
      .toLowerCase();
    if (!answer) return defaultValue;
    return ["s", "sim", "y", "yes"].includes(answer);
  }

  async select(label, options, defaultIndex = 0) {
    this.output.write(`${label}\n`);
    options.forEach((option, index) => {
      this.output.write(`  ${index + 1}. ${option.label}\n`);
    });
    const answer = await this.text("Escolha", String(defaultIndex + 1));
    const selected = Number.parseInt(answer, 10) - 1;
    if (!Number.isInteger(selected) || !options[selected]) {
      throw new Error(`Opção inválida: ${answer}.`);
    }
    return options[selected].value;
  }

  close() {
    this.readline.close();
  }
}

function parseCycles(value) {
  const cycles = Number.parseInt(value, 10);
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 10) {
    throw new Error("Ciclos deve ser número entre 1 e 10.");
  }
  return cycles;
}

function parseTimeoutMinutes(value) {
  const minutes = Number.parseInt(value, 10);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
    throw new Error("Timeout deve ser número entre 1 e 60 minutos.");
  }
  return minutes * 60_000;
}

export async function runInteractiveWizard({
  prompter = new TerminalPrompter(),
  currentDirectory = process.cwd(),
} = {}) {
  try {
    const suggestion =
      path.resolve(currentDirectory) === orchestratorRoot ? "" : currentDirectory;
    const answer = await prompter.text(
      "Pasta do app React Native (caminho completo)",
      suggestion,
    );
    if (!answer) {
      throw new Error(
        "Informe a pasta do app React Native, por exemplo /Users/voce/Documents/meu-app.",
      );
    }
    const projectPath = assertNotOrchestrator(path.resolve(answer));
    await access(projectPath);
    const detected = await detectReactNativeProject(projectPath);

    if (!detected.isReactNative) {
      const proceed = await prompter.confirm(
        "React Native/Expo não detectado. Continuar mesmo assim?",
        false,
      );
      if (!proceed) throw new Error("Projeto cancelado: React Native não detectado.");
    }

    const app = await loadProjectConfig(projectPath);
    const appRules = await loadAppRules(app);
    if (app.exists) {
      prompter.output?.write(
        `Configuração encontrada em apps/${app.name}.\n`,
      );
    }

    const profileName = await prompter.select(
      "Perfil de execução:",
      [
        {
          label: `unattended — ${profiles.unattended.description}`,
          value: "unattended",
        },
        { label: `fast — ${profiles.fast.description}`, value: "fast" },
        {
          label: "nenhum — o brief decide os gates, mercado desligado",
          value: "",
        },
      ],
      app.profile === "fast" ? 1 : app.profile === "unattended" ? 0 : 2,
    );
    const profile = profileName ? profiles[profileName] : null;

    const provider = await prompter.select(
      "Agente de desenvolvimento:",
      [
        { label: "Codex", value: "codex" },
        { label: "Claude Code", value: "claude" },
      ],
      (app.provider ?? "codex") === "claude" ? 1 : 0,
    );

    const task = await prompter.text("Feature a implementar");
    if (!task) throw new Error("Feature não pode ficar vazia.");
    const acceptanceCriteria =
      (await prompter.text("Critérios de aceitação (opcional)")) ||
      `Cumprir integralmente: ${task}`;

    let packageName = detected.packageCandidates[0]?.value ?? "";
    if (detected.packageCandidates.length > 1) {
      packageName = await prompter.select(
        "Mais de um package Android detectado:",
        detected.packageCandidates.map((candidate) => ({
          label: `${candidate.value} — ${candidate.sources.join(", ")}`,
          value: candidate.value,
        })),
      );
    }

    let android = null;
    const enableAndroid = await prompter.confirm(
      packageName
        ? `Testar Android com package ${packageName}?`
        : "Package Android não detectado. Informar manualmente?",
      Boolean(packageName),
    );
    if (enableAndroid) {
      packageName = packageName || (await prompter.text("Package Android"));
      if (!packageName) throw new Error("Package Android obrigatório para tester.");
      android = {
        packageName,
        activity: await prompter.text("Activity inicial", detected.activity),
        deviceId: await prompter.text("Serial ADB (vazio = automático)"),
        stepsFile: await prompter.text("Arquivo de passos ADB (opcional)"),
      };
    }

    let marketingMode = await prompter.select(
      "Análise de mercado:",
      [
        { label: "Contexto antes da implementação", value: "context" },
        {
          label: "Contexto + checagem visual pós-implementação",
          value: "full",
        },
        { label: "Desativada", value: "none" },
      ],
      (profile?.marketingMode ?? app.marketingMode ?? "context") === "none"
        ? 2
        : (profile?.marketingMode ?? app.marketingMode) === "full"
          ? 1
          : 0,
    );
    if (marketingMode === "full" && !android) {
      marketingMode = "context";
      prompter.output?.write(
        "Checagem visual requer tester Android; usando somente contexto.\n",
      );
    }

    const category =
      marketingMode === "none"
        ? ""
        : await prompter.text("Categoria/público do app (opcional)");
    const competitorsText =
      marketingMode === "none"
        ? ""
        : await prompter.text(
            "Concorrentes ou URLs, separados por vírgula (opcional)",
          );

    return {
      provider,
      projectPath,
      task,
      acceptanceCriteria,
      profileName: profileName || null,
      gateOverrides: profile?.gateOverrides ?? {},
      appRules,
      appName: app.exists ? app.name : null,
      maxCycles: parseCycles(
        await prompter.text("Máximo de ciclos", String(profile?.maxCycles ?? 3)),
      ),
      agentTimeoutMs: parseTimeoutMinutes(
        await prompter.text("Timeout por agente em minutos", "10"),
      ),
      model: await prompter.text(
        `Modelo ${provider === "claude" ? "Claude" : "Codex"} (vazio = padrão)`,
      ),
      auxiliaryModel: await prompter.text(
        "Modelo para tester/revisores (vazio = principal)",
      ),
      designReasoningEffort: await prompter.text(
        "Reasoning de design/UX",
        profile?.designReasoningEffort ?? "high",
      ),
      codeReasoningEffort: await prompter.text(
        "Reasoning de implementação",
        profile?.codeReasoningEffort ?? "low",
      ),
      android: android
        ? {
            ...android,
            stepsFile: android.stepsFile || app.adbSteps || "",
          }
        : null,
      marketing: {
        mode: marketingMode,
        appContext: {
          appName: detected.appName,
          packageName: packageName || null,
          category: category || null,
        },
        competitors: competitorsText
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      },
      detected,
    };
  } finally {
    prompter.close?.();
  }
}
