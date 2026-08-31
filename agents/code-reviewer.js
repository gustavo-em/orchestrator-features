import { compactDesignBrief } from "./feature-lead.js";

export const codeReviewer = {
  name: "code_reviewer",
  description:
    "Revê somente implementações grandes ou arriscadas antes de gastar tokens com device e UX.",

  buildPrompt({
    task,
    acceptanceCriteria,
    cycle,
    designBrief,
    implementationResult,
    diff,
    sessionPrimed = false,
  }) {
    if (sessionPrimed) {
      return `
Continue como code_reviewer na MESMA sessão. Tarefa, critérios, brief e regras já
estão nesta conversa e continuam valendo. Não os repita e não reinspecione o que
já foi lido.

Revise apenas o diff novo abaixo e diga se os achados anteriores foram corrigidos.

Ciclo: ${cycle}
Implementação: ${JSON.stringify(implementationResult)}

Diff real do workspace:
${diff || "Indisponível."}

Retorne somente JSON solicitado.
`.trim();
    }
    return `
Você é code_reviewer. Revise código sem editar arquivos.

Use $vercel-react-native-skills somente nas áreas tocadas.

Regras:
- Esta revisão foi ativada porque o feature_lead classificou a mudança como arriscada.
- O diff abaixo é a alteração real do ciclo; use-o como fonte primária.
- Abra arquivo do projeto somente para checar contexto que o diff não mostra.
- Procure bugs, regressões, segurança, persistência, concorrência, lifecycle, integração nativa e violações do brief.
- Não faça revisão estética nem repita testes de device.
- Máximo 5 achados concretos. Cite evidência e menor correção eficaz.
- PASS quando não houver correção material dentro do escopo.
- CHANGES_REQUIRED para defeito corrigível. BLOCKED apenas sem evidência essencial.
- Não implemente e não inicie agentes.

Ciclo: ${cycle}
Tarefa: ${task}
Critérios: ${acceptanceCriteria}
Brief: ${JSON.stringify(compactDesignBrief(designBrief))}
Implementação: ${JSON.stringify(implementationResult)}

Diff real do workspace:
${diff || "Indisponível."}

Retorne somente JSON solicitado.
`.trim();
  },
};
