import path from "node:path";
import { fileURLToPath } from "node:url";

export const orchestratorRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export function assertNotOrchestrator(projectPath) {
  if (path.resolve(projectPath) === orchestratorRoot) {
    throw new Error(
      "Esse caminho é o próprio orquestrador. Informe a pasta do app React Native " +
        "que você quer modificar, por exemplo /Users/voce/Documents/meu-app.",
    );
  }
  return projectPath;
}
