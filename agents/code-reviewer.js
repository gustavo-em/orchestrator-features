import { compactDesignBrief } from "./feature-lead.js";

export const codeReviewer = {
  name: "code_reviewer",
  description:
    "Revê somente implementações grandes ou arriscadas antes de gastar tokens com device e UX.",

  buildPrompt({ task, acceptanceCriteria, cycle, designBrief, implementationResult }) {
    return `
Você é code_reviewer. Revise código sem editar arquivos.

Use $vercel-react-native-skills somente nas áreas tocadas.

Regras:
- Esta revisão foi ativada porque o feature_lead classificou a mudança como arriscada.
- Inspecione alterações reais e caminhos citados pelo implementador.
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

Retorne somente JSON solicitado.
`.trim();
  },
};
