Implementar a simplificação em camadas da folha de captura, aprovada pelo dono
(brief do run 2026-09-01T22-46-36 — siga o plano dele à risca):

- Camada 0 (criação, estado inicial): grabber, campo com foco automático e borda
  accent, linha de controles com expansor "Mais opções" (chevron, 48dp, role
  button + accessibilityState.expanded) e botão "?" circular 48px em muted,
  Cancelar/Salvar. Alvo: 5 elementos visíveis.
- Fichas resolvidas pelo parser/override aparecem AUTOMATICAMENTE na camada 0
  (data, prioridade≠média, projeto ou estimativa) — o feedback do parsing nunca
  some.
- Camada 1 (expandido): as 3 fichas sempre visíveis + Hint. Fecha por novo
  toque. Painéis de data/lista/novo projeto seguem no slot atual.
- Camada 2 ("?"): bloco de exemplos de sintaxe no MESMO slot dos painéis
  (CalendarPanel/ListPanel), união de `panel` ganha "syntax"; fecha ao tocar de
  novo. Nunca visível junto com o Hint na camada 0.
- Edição (editing != null) abre expandida, mostra editHint e nunca a sintaxe.
- Estado expandido não persiste: toda criação nasce mínima.
- Motion: fichas reveladas com fade+altura curta, presets já usados nos painéis;
  sem salto do bloco de ações.
- Copy nova: capture.moreOptions, capture.lessOptions, capture.syntaxTitle,
  capture.syntaxHelp (pt-BR/en-US, teste de paridade).
- NÃO tocar: parseCapture, captureTask, SheetActions, bloqueio de Salvar vazio,
  e nenhum vermelho novo (regras fixas valem).
