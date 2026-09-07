import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRunsDirectory = path.resolve(currentDirectory, "../runs");

function createRunId() {
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

export class JsonRunStateStore {
  constructor({ runsDirectory = defaultRunsDirectory } = {}) {
    this.runsDirectory = runsDirectory;
    this.runId = createRunId();
    this.filePath = path.join(runsDirectory, `${this.runId}.json`);
  }

  async save(state) {
    const payload = `${JSON.stringify(state, null, 2)}\n`;
    const temporaryPath = `${this.filePath}.tmp`;
    // EPERM/EBUSY transitórios (TCC, indexador, antivírus) não podem derrubar
    // um run noturno: tenta de novo e, em último caso, grava direto sem rename.
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await mkdir(this.runsDirectory, { recursive: true });
        await writeFile(temporaryPath, payload, "utf8");
        await rename(temporaryPath, this.filePath);
        return this.filePath;
      } catch (error) {
        if (attempt === 3) {
          await writeFile(this.filePath, payload, "utf8");
          return this.filePath;
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
    return this.filePath;
  }
}
