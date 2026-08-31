import { exec, execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
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
      ].includes(action)
    ) {
      throw new Error(`Ação ADB não permitida: ${action}.`);
    }
    return { ...step };
  });
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
    const { stdout, stderr } = await execFileAsync(
      "rtk",
      ["adb", ...this.adbPrefix(), ...args],
      {
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    return trimOutput(`${stdout}\n${stderr}`, maxCharacters);
  }

  async runBinaryAdb(args) {
    const { stdout } = await execFileAsync(
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

  async runStep(step, cycleDirectory, screenshots) {
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
      case "tapText": {
        if (typeof step.value !== "string") {
          throw new Error("tapText.value deve ser string.");
        }
        const nodes = await this.captureUiHierarchy();
        const node = findNodeByText(nodes, step.value);
        const center = node ? centerOfBounds(node.bounds) : null;
        if (!center) {
          if (step.optional) break;
          throw new Error(
            `tapText: "${step.value}" não encontrado na tela atual.`,
          );
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
      case "checkpoint":
        screenshots.push(await this.captureScreenshot(cycleDirectory, step.name));
        break;
    }
  }

  async captureScreenshot(cycleDirectory, name = "final") {
    const safeName = String(name ?? "final").replaceAll(/[^a-zA-Z0-9_-]/g, "-");
    const screenshotPath = path.join(cycleDirectory, `${safeName}.png`);
    const screenshot = await this.runBinaryAdb(["exec-out", "screencap", "-p"]);
    await writeFile(screenshotPath, screenshot);
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

  collectEvidence({ cycle }) {
    return this.lock(() => this.collectEvidenceExclusive({ cycle }));
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

  async collectEvidenceExclusive({ cycle }) {
    const cycleDirectory = path.join(this.artifactsDirectory, `cycle-${cycle}`);
    await mkdir(cycleDirectory, { recursive: true });

    const build = await this.buildAndInstall();
    const device = await this.ensureDevice();
    await this.runTextAdb(["logcat", "-c"]);
    await this.runTextAdb(["shell", "am", "force-stop", this.packageName]);
    const launch = await this.runTextAdb([
      "shell",
      "am",
      "start",
      "-W",
      "-n",
      `${this.packageName}/${this.activity}`,
    ]);

    let rendered = await this.waitUntilRendered();
    if (!rendered.ready) {
      await this.runTextAdb(["shell", "am", "force-stop", this.packageName]);
      await this.runTextAdb([
        "shell",
        "am",
        "start",
        "-W",
        "-n",
        `${this.packageName}/${this.activity}`,
      ]);
      rendered = await this.waitUntilRendered();
    }

    const screenshots = [];
    for (const step of this.steps) {
      await this.runStep(step, cycleDirectory, screenshots);
    }
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

    return {
      device,
      packageName: this.packageName,
      activity: this.activity,
      build,
      launch,
      rendered: rendered.ready,
      screenshots,
      uiNodes,
      errors,
    };
  }
}
