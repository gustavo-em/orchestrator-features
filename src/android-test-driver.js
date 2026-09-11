import { exec, execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

function trimOutput(value, maxCharacters = 3000) {
  const text = String(value ?? "").trim();
  if (text.length <= maxCharacters) return text;
  return `<cortado ${text.length - maxCharacters} chars>\n${text.slice(-maxCharacters)}`;
}

function decodeXml(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

const LOADING_PATTERN =
  /downloading|bundling|loading from metro|building javascript|please wait/i;

export function looksLoading(nodes, minimumNodes = 4) {
  if (!Array.isArray(nodes) || nodes.length < minimumNodes) return true;
  const text = nodes
    .map((node) => `${node.text ?? ""} ${node["content-desc"] ?? ""}`)
    .join(" ");
  return LOADING_PATTERN.test(text);
}

export function compactUiHierarchy(xml, maxNodes = 100) {
  const nodes = [];
  const attributePattern =
    /(text|resource-id|class|content-desc|clickable|enabled|bounds)="([^"]*)"/g;

  for (const nodeMatch of xml.matchAll(/<node\b([^>]*)\/?\s*>/g)) {
    const attributes = {};
    for (const attribute of nodeMatch[1].matchAll(attributePattern)) {
      attributes[attribute[1]] = decodeXml(attribute[2]);
    }

    const relevant =
      attributes.text ||
      attributes["content-desc"] ||
      attributes["resource-id"] ||
      attributes.clickable === "true";
    if (!relevant) continue;

    nodes.push(attributes);
    if (nodes.length >= maxNodes) break;
  }

  return nodes;
}

export function centerOfBounds(bounds) {
  const match = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(String(bounds ?? ""));
  if (!match) return null;
  const [, left, top, right, bottom] = match.map(Number);
  return [Math.round((left + right) / 2), Math.round((top + bottom) / 2)];
}

function boundsArea(bounds) {
  const match = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(String(bounds ?? ""));
  if (!match) return 0;
  const [, left, top, right, bottom] = match.map(Number);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

/** Um mesmo texto costuma aparecer no rótulo e no alvo de toque. O alvo é o
 *  que tem descrição de acessibilidade, é clicável e é maior; o rótulo é um
 *  retângulo pequeno que pode estar em qualquer canto da tela. */
export function findNodeByText(nodes, target) {
  const needle = String(target).trim().toLowerCase();
  if (!needle) return null;

  const scored = (nodes ?? [])
    .map((node) => {
      const text = String(node.text ?? "").trim().toLowerCase();
      const description = String(node["content-desc"] ?? "").trim().toLowerCase();
      const matches = [text, description].filter(Boolean);
      if (!matches.some((value) => value.includes(needle))) return null;

      let score = 0;
      if (matches.some((value) => value === needle)) score += 4;
      if (node.clickable === "true") score += 3;
      if (description.includes(needle)) score += 1;
      return { node, score, area: boundsArea(node.bounds) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.area - a.area);

  return scored[0]?.node ?? null;
}

function validateInteger(value, label) {
  if (!Number.isInteger(value)) throw new Error(`${label} deve ser inteiro.`);
  return String(value);
}

export function validateAdbSteps(steps) {
  if (!Array.isArray(steps)) throw new Error("Arquivo de passos ADB deve conter array.");
  if (steps.length > 50) throw new Error("Máximo de 50 passos ADB.");

  return steps.map((step, index) => {
    if (!step || typeof step !== "object" || typeof step.action !== "string") {
      throw new Error(`Passo ADB ${index + 1} inválido.`);
    }

    const action = step.action;
    if (
      ![
        "tap",
        "tapText",
        "scrollToEnd",
        "text",
        "keyevent",
        "swipe",
        "wait",
        "checkpoint",
        "night",
        "hideKeyboard",
        "tree",
        "longPress",
        "deeplink",
      ].includes(action)
    ) {
      throw new Error(`Ação ADB não permitida: ${action}.`);
    }
    return { ...step };
  });
}

/** BUILD_FAILED e STEP_FAILED são defeitos que o feature_lead corrige com
 *  feedback; qualquer outro erro (device, Metro, adb) é infra e vale retry. */
export function classifyEvidenceError(error) {
  if (error?.code === "BUILD_FAILED") return "build";
  if (error?.code === "STEP_FAILED") return "step";
  return "infra";
}

export class AndroidTestDriver {
  constructor({
    packageName,
    activity = ".MainActivity",
    deviceId,
    steps = [],
    artifactsDirectory,
    projectPath,
    buildCommand,
    buildTimeoutMs = 20 * 60_000,
    readyTimeoutMs = 120_000,
    readyPollMs = 3_000,
    lock = (operation) => operation(),
    infraRetries = 3,
    infraBackoffMs = 20_000,
    waitForServices = null,
    onInfraRetry = null,
    execFileRunner = execFileAsync,
    deviceState = "manter",
  }) {
    this.packageName = packageName;
    this.activity = activity;
    this.deviceId = deviceId;
    this.steps = validateAdbSteps(steps);
    this.artifactsDirectory = artifactsDirectory;
    this.projectPath = projectPath;
    this.buildCommand = buildCommand;
    this.buildTimeoutMs = buildTimeoutMs;
    this.readyTimeoutMs = readyTimeoutMs;
    this.readyPollMs = readyPollMs;
    this.lock = lock;
    this.infraRetries = infraRetries;
    this.infraBackoffMs = infraBackoffMs;
    this.waitForServices = waitForServices;
    this.onInfraRetry = onInfraRetry;
    this.execFileRunner = execFileRunner;
    this.rtkMissing = false;
    this.deviceState = deviceState;
    this.devicePrepared = false;
  }

  /** O agente edita package.json mas nada garante o install antes do build:
   *  npm mantém node_modules/.package-lock.json em sincronia, então divergência
   *  entre ele e o package-lock.json da raiz denuncia dependência fantasma. */
  async ensureDependencies() {
    if (!this.projectPath) return null;
    let expected;
    try {
      expected = await readFile(
        path.join(this.projectPath, "package-lock.json"),
        "utf8",
      );
    } catch {
      return null;
    }
    let installed = null;
    try {
      installed = await readFile(
        path.join(this.projectPath, "node_modules", ".package-lock.json"),
        "utf8",
      );
    } catch {
      installed = null;
    }
    if (installed !== null && installed === expected) return null;
    return this.runInstall();
  }

  async runInstall() {
    try {
      const { stdout, stderr } = await execAsync(
        "npm install --no-audit --no-fund",
        {
          cwd: this.projectPath,
          encoding: "utf8",
          maxBuffer: 32 * 1024 * 1024,
          timeout: 10 * 60_000,
        },
      );
      return { status: "OK", output: trimOutput(`${stdout}\n${stderr}`, 800) };
    } catch (error) {
      const output = trimOutput(
        `${error.stdout ?? ""}\n${error.stderr ?? error.message}`,
        2000,
      );
      const failure = new Error(
        `npm install falhou antes do teste de tela.\n${output}`,
      );
      // Conflito de dependência é corrigível pelo agente; o resto (rede,
      // registry fora) é infra e ganha retry.
      if (/ERESOLVE|ETARGET|EBADENGINE|peer dep/i.test(output)) {
        failure.code = "BUILD_FAILED";
      }
      throw failure;
    }
  }

  async buildAndInstall() {
    if (!this.buildCommand) return null;
    try {
      const { stdout, stderr } = await execAsync(this.buildCommand, {
        cwd: this.projectPath,
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
        timeout: this.buildTimeoutMs,
      });
      return { status: "OK", output: trimOutput(`${stdout}\n${stderr}`, 1200) };
    } catch (error) {
      const output = trimOutput(
        `${error.stdout ?? ""}\n${error.stderr ?? error.message}`,
        2000,
      );
      const failure = new Error(`Build falhou antes do teste de tela.\n${output}`);
      failure.code = "BUILD_FAILED";
      throw failure;
    }
  }

  adbPrefix() {
    return this.deviceId ? ["-s", this.deviceId] : [];
  }

  async runTextAdb(args, maxCharacters = 3000) {
    // rtk vem do shell interativo; num cron ele pode não existir no PATH —
    // nesse caso o adb puro serve, só sem a filtragem de tokens.
    const launchers = this.rtkMissing ? [["adb"]] : [["rtk", "adb"], ["adb"]];
    for (const [index, launcher] of launchers.entries()) {
      try {
        const { stdout, stderr } = await this.execFileRunner(
          launcher[0],
          [...launcher.slice(1), ...this.adbPrefix(), ...args],
          {
            encoding: "utf8",
            maxBuffer: 4 * 1024 * 1024,
          },
        );
        return trimOutput(`${stdout}\n${stderr}`, maxCharacters);
      } catch (error) {
        const canFallback =
          index === 0 && launchers.length > 1 && error.code === "ENOENT";
        if (!canFallback) throw error;
        this.rtkMissing = true;
      }
    }
    throw new Error("adb indisponível.");
  }

  async runBinaryAdb(args) {
    const { stdout } = await this.execFileRunner(
      "adb",
      [...this.adbPrefix(), ...args],
      {
        encoding: "buffer",
        maxBuffer: 20 * 1024 * 1024,
      },
    );
    return stdout;
  }

  async ensureDevice() {
    const output = await this.runTextAdb(["devices", "-l"], 1500);
    const devices = output
      .split("\n")
      .filter((line) => /\sdevice(?:\s|$)/.test(line) && !line.startsWith("List of"));

    if (!devices.length) throw new Error("Nenhum Android device disponível via ADB.");
    if (!this.deviceId && devices.length > 1) {
      throw new Error("Mais de um device ADB. Informe --adb-device.");
    }
    return devices[0].trim();
  }

  async runStep(step, cycleDirectory, screenshots, trees = []) {
    switch (step.action) {
      case "tap":
        await this.runTextAdb([
          "shell",
          "input",
          "tap",
          validateInteger(step.x, "x"),
          validateInteger(step.y, "y"),
        ]);
        break;
      case "deeplink": {
        if (
          typeof step.value !== "string" ||
          !/^[a-z][a-z0-9+.-]*:/i.test(step.value)
        ) {
          throw new Error("deeplink.value deve ser uma URL com esquema.");
        }
        // O mesmo VIEW que o app recebe quando alguém toca no link, entregue
        // direto ao componente: sem caixa de escolha do Android e sem depender
        // de qual navegador está instalado. Com o app já aberto isso chega
        // como onNewIntent, que é justamente o caso de quem já tem sessão.
        await this.runTextAdb([
          "shell",
          "am",
          "start",
          "-a",
          "android.intent.action.VIEW",
          "-d",
          step.value,
          `${this.packageName}/${this.activity}`,
        ]);
        break;
      }
      case "tapText": {
        if (typeof step.value !== "string") {
          throw new Error("tapText.value deve ser string.");
        }
        const nodes = await this.captureUiHierarchy();
        const node = findNodeByText(nodes, step.value);
        const center = node ? centerOfBounds(node.bounds) : null;
        if (!center) {
          if (step.optional) break;
          const failure = new Error(
            `tapText: "${step.value}" não encontrado na tela atual.`,
          );
          failure.code = "STEP_FAILED";
          throw failure;
        }
        await this.runTextAdb([
          "shell",
          "input",
          "tap",
          String(center[0]),
          String(center[1]),
        ]);
        break;
      }
      case "scrollToEnd": {
        const times = Math.min(Number(step.times ?? 4), 12);
        for (let index = 0; index < times; index += 1) {
          await this.runTextAdb([
            "shell",
            "input",
            "swipe",
            "540",
            "1700",
            "540",
            "500",
            "300",
          ]);
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
        break;
      }
      case "text":
        if (typeof step.value !== "string") throw new Error("text.value deve ser string.");
        await this.runTextAdb([
          "shell",
          "input",
          "text",
          step.value.replaceAll(" ", "%s"),
        ]);
        break;
      case "keyevent":
        await this.runTextAdb(["shell", "input", "keyevent", String(step.value)]);
        break;
      case "swipe":
        await this.runTextAdb([
          "shell",
          "input",
          "swipe",
          validateInteger(step.x1, "x1"),
          validateInteger(step.y1, "y1"),
          validateInteger(step.x2, "x2"),
          validateInteger(step.y2, "y2"),
          validateInteger(step.duration ?? 300, "duration"),
        ]);
        break;
      case "wait": {
        const milliseconds = Number(step.ms ?? 500);
        if (!Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > 30000) {
          throw new Error("wait.ms deve estar entre 0 e 30000.");
        }
        await new Promise((resolve) => setTimeout(resolve, milliseconds));
        break;
      }
      case "checkpoint": {
        const shot = await this.captureScreenshot(cycleDirectory, step.name);
        // Screenshot com teclado aberto engana o julgamento de visibilidade:
        // o tester precisa saber o que estava cobrindo a metade de baixo.
        if (await this.isKeyboardVisible()) shot.keyboard = true;
        screenshots.push(shot);
        break;
      }
      case "hideKeyboard":
        await this.dismissKeyboard();
        break;
      case "tree": {
        const treeName = String(step.name ?? `tree-${trees.length + 1}`);
        trees.push({ name: treeName, nodes: await this.captureUiHierarchy() });
        break;
      }
      case "longPress": {
        const x = validateInteger(step.x, "x");
        const y = validateInteger(step.y, "y");
        await this.runTextAdb([
          "shell",
          "input",
          "swipe",
          x,
          y,
          x,
          y,
          String(step.duration ?? 600),
        ]);
        break;
      }
      case "night": {
        const mode = step.value === "yes" || step.value === true ? "yes" : "no";
        await this.runTextAdb(["shell", "cmd", "uimode", "night", mode]);
        await new Promise((resolve) => setTimeout(resolve, 800));
        break;
      }
    }
  }

  async isKeyboardVisible() {
    try {
      const output = await this.runTextAdb(
        ["shell", "dumpsys input_method | grep mInputShown"],
        300,
      );
      return output.includes("mInputShown=true");
    } catch {
      return false;
    }
  }

  // BACK com IME aberto é consumido pelo teclado: fecha sem navegar.
  async dismissKeyboard() {
    if (!(await this.isKeyboardVisible())) return false;
    await this.runTextAdb(["shell", "input", "keyevent", "4"]);
    await new Promise((resolve) => setTimeout(resolve, 400));
    return true;
  }

  async isAppForeground() {
    try {
      const focus = await this.runTextAdb(
        ["shell", "dumpsys window | grep mCurrentFocus"],
        500,
      );
      return focus.includes(this.packageName);
    } catch {
      return true;
    }
  }

  async launchApp() {
    return this.runTextAdb([
      "shell",
      "am",
      "start",
      "-W",
      "-n",
      `${this.packageName}/${this.activity}`,
    ]);
  }

  async captureScreenshot(cycleDirectory, name = "final") {
    const safeName = String(name ?? "final").replaceAll(/[^a-zA-Z0-9_-]/g, "-");
    const screenshotPath = path.join(cycleDirectory, `${safeName}.png`);
    const screenshot = await this.runBinaryAdb(["exec-out", "screencap", "-p"]);
    await writeFile(screenshotPath, screenshot);
    // Device físico fotografa em resolução alta e imagem não entra no cache do
    // modelo: reduzir no host corta ~4x o custo de cada evidência sem perder
    // legibilidade de julgamento.
    await execAsync(
      `sips --resampleHeight 1200 ${JSON.stringify(screenshotPath)}`,
      { timeout: 15_000 },
    ).catch(() => {});
    return { name: safeName, path: screenshotPath };
  }

  async captureUiHierarchy() {
    await this.runTextAdb([
      "shell",
      "uiautomator",
      "dump",
      "/sdcard/orquestrador-window.xml",
    ]);
    const xml = await this.runBinaryAdb([
      "exec-out",
      "cat",
      "/sdcard/orquestrador-window.xml",
    ]);
    return compactUiHierarchy(xml.toString("utf8"));
  }

  async collectEvidence({ cycle, extraSteps = [] }) {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.lock(() =>
          this.collectEvidenceExclusive({ cycle, extraSteps }),
        );
      } catch (error) {
        if (
          classifyEvidenceError(error) !== "infra" ||
          attempt > this.infraRetries
        ) {
          throw error;
        }
        this.onInfraRetry?.({
          attempt,
          retries: this.infraRetries,
          message: error.message,
        });
        await this.waitForServices?.().catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, this.infraBackoffMs));
      }
    }
  }

  async waitUntilRendered() {
    const deadline = Date.now() + this.readyTimeoutMs;
    let nodes = [];

    while (Date.now() < deadline) {
      try {
        nodes = await this.captureUiHierarchy();
      } catch {
        nodes = [];
      }
      if (!looksLoading(nodes)) {
        return { ready: true, nodes };
      }
      await new Promise((resolve) => setTimeout(resolve, this.readyPollMs));
    }

    return { ready: false, nodes };
  }

  async collectEvidenceExclusive({ cycle, extraSteps = [] }) {
    const steps = extraSteps.length
      ? [...this.steps, ...validateAdbSteps(extraSteps)]
      : this.steps;
    const cycleDirectory = path.join(this.artifactsDirectory, `cycle-${cycle}`);
    await mkdir(cycleDirectory, { recursive: true });

    const install = await this.ensureDependencies();
    const build = await this.buildAndInstall();
    const device = await this.ensureDevice();
    // Device físico via USB precisa do reverse para enxergar o Metro do host;
    // no emulador o comando é inócuo.
    await this.runTextAdb(["reverse", "tcp:8081", "tcp:8081"]).catch(() => {});
    // Tela bloqueada renderia o keyguard/AOD como "evidência": acorda, tenta
    // dispensar e, se houver PIN segurando, é infra (retry espera o humano).
    await this.runTextAdb(["shell", "input", "keyevent", "KEYCODE_WAKEUP"]).catch(() => {});
    await this.runTextAdb(["shell", "wm", "dismiss-keyguard"]).catch(() => {});
    const keyguard = await this.runTextAdb(
      ["shell", "dumpsys window | grep isKeyguardShowing"],
      300,
    ).catch(() => "");
    if (keyguard.includes("isKeyguardShowing=true")) {
      throw new Error(
        "Tela do device bloqueada (keyguard com PIN/biometria): desbloqueie o " +
          "aparelho ou desative o bloqueio de tela durante os testes.",
      );
    }
    // Estado herdado da tarefa anterior (tema escuro, sessão, teclado) não
    // pode contaminar a evidência: tema sempre volta ao claro; "limpo" zera os
    // dados do app uma vez por run.
    await this.runTextAdb(["shell", "cmd", "uimode", "night", "no"]).catch(
      () => {},
    );
    if (this.deviceState === "limpo" && !this.devicePrepared) {
      this.devicePrepared = true;
      await this.runTextAdb(["shell", "pm", "clear", this.packageName]);
    }
    await this.runTextAdb(["logcat", "-c"]);
    await this.runTextAdb(["shell", "am", "force-stop", this.packageName]);
    const launch = await this.launchApp();

    let rendered = await this.waitUntilRendered();
    if (!rendered.ready) {
      await this.runTextAdb(["shell", "am", "force-stop", this.packageName]);
      await this.launchApp();
      rendered = await this.waitUntilRendered();
    }

    const screenshots = [];
    const interruptions = [];
    const ineffectiveSteps = [];
    const trees = [];
    const INTERACTIVE = new Set([
      "tap",
      "tapText",
      "text",
      "keyevent",
      "swipe",
      "longPress",
      "deeplink",
    ]);
    let lastSignature = null;
    for (const step of steps) {
      const interactive = INTERACTIVE.has(step.action);
      if (interactive && lastSignature === null) {
        lastSignature = JSON.stringify(await this.captureUiHierarchy().catch(() => null));
      }
      await this.runStep(step, cycleDirectory, screenshots, trees);
      // Passo interativo que não altera a árvore de UI é o tester pedindo a
      // mesma evidência para sempre: registrar quebra o loop.
      if (interactive) {
        const signature = JSON.stringify(
          await this.captureUiHierarchy().catch(() => null),
        );
        if (signature === lastSignature) {
          ineffectiveSteps.push(
            `${step.action}` +
              (step.value !== undefined ? ` (${step.value})` : "") +
              (step.x !== undefined ? ` (${step.x},${step.y})` : "") +
              " não alterou a tela",
          );
        }
        lastSignature = signature;
      }
      // App fora do foreground após um passo (BACK na raiz, crash) renderia
      // launcher em todos os checkpoints seguintes: religa e registra o fato
      // como evidência — o tester decide se é bug de navegação.
      //
      // `keepForeign` desliga isso para o passo: a saída esperada É outro
      // pacote no topo (o seletor de compartilhamento do Android), e relançar
      // o app antes do checkpoint apagaria justamente a prova pedida. O
      // roteiro volta sozinho com um keyevent 4, e o passo seguinte sem a
      // marca volta a religar o app se ele ainda não estiver na frente.
      if (step.keepForeign === true) {
        if (!(await this.isAppForeground())) {
          interruptions.push(
            `outro app em primeiro plano após o passo ${step.action}` +
              (step.value ? ` (${step.value})` : "") +
              (step.name ? ` (${step.name})` : "") +
              "; mantido na tela para a captura",
          );
        }
        continue;
      }
      if (!(await this.isAppForeground())) {
        interruptions.push(
          `app saiu da tela após o passo ${step.action}` +
            (step.value ? ` (${step.value})` : "") +
            (step.name ? ` (${step.name})` : "") +
            "; relançado para continuar a coleta",
        );
        await this.launchApp();
        await this.waitUntilRendered();
      }
    }
    // Captura final sempre com teclado fechado: é ela que ancora "elemento
    // visível/ausente".
    await this.dismissKeyboard();
    screenshots.push(await this.captureScreenshot(cycleDirectory));

    // A árvore precisa ser lida DEPOIS dos passos: reaproveitar a leitura da
    // checagem de renderização devolveria o estado anterior à navegação.
    const [uiNodes, errors] = await Promise.all([
      this.captureUiHierarchy(),
      this.runTextAdb(
        ["logcat", "-d", "-t", "250", "AndroidRuntime:E", "ReactNativeJS:W", "*:S"],
        4000,
      ),
    ]);

    if (steps.some((step) => step.action === "night")) {
      await this.runTextAdb(["shell", "cmd", "uimode", "night", "no"]).catch(
        () => {},
      );
    }

    return {
      device,
      packageName: this.packageName,
      activity: this.activity,
      install,
      build,
      launch,
      rendered: rendered.ready,
      screenshots,
      interruptions,
      ineffectiveSteps,
      trees,
      uiNodes,
      errors,
    };
  }
}
