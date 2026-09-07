1. Abrir captura (criação): exatamente a camada 0 — campo focado, "Mais opções",
   "?", Cancelar/Salvar; nenhuma ficha, nenhum hint, nenhuma sintaxe (screenshot
   + árvore).
2. Digitar texto com sintaxe (ex.: "amanhã urgente"): as fichas resolvidas
   aparecem sozinhas na camada 0; salvar produz a tarefa com data/prioridade
   corretas.
3. "Mais opções" expande (fichas + hint) e recolhe; estado anunciado por
   accessibilityState.expanded; alvos ≥ 48dp.
4. "?" abre o bloco de sintaxe no slot dos painéis e fecha; nunca coexiste com o
   hint da camada 0.
5. Editar tarefa existente: folha abre expandida, com editHint, sem sintaxe.
6. Fechar e reabrir a captura: nasce mínima de novo.
7. Sem regressão: Salvar desabilitado vazio, painéis de data/lista funcionam,
   nenhum container novo aninhado (sem card em card), tema claro/escuro.
8. Paridade de copy pt-BR/en-US; `npm run validate` verde.
