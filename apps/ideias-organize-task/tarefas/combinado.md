Implementar a fase 2 dos projetos compartilhados: a faixa "Hoje, no combinado" no
topo do projeto compartilhado aberto.

Fonte de verdade, nesta ordem — leia antes de planejar e trate como decisões
aprovadas pelo dono:

- `docs/design/combinado-fase2.md` — o pacote completo: o que já existe da fase 1
  (NÃO reimplemente nada da tabela), os dois tokens novos de tema, o modelo
  `sharedDay` com as seis regras testáveis, a geometria exata da `SharedDayBand`,
  as chaves de copy nos dois idiomas, e a ordem de trabalho de 8 passos.
- `docs/design/ui-projeto-compartilhado.md` §4 — geometria detalhada da faixa.
- `docs/design/projeto-compartilhado.md` — domínio (com a correção de escopo
  registrada no pacote: `SharedMemberDay` publicado por membro/dia).

Siga a ordem de trabalho do pacote (tema → modelo puro + teste → MemberChip
`inverted` → SharedDayBand → copy → ListsScreen → ADR → `npm run validate`).

Decisões já tomadas — não reabra:

- `focusing` é opcional nesta fatia: se exigir presença ao vivo, entregue sem ele.
- O placar é individual e não sai do aparelho; a faixa mostra só o que cada um
  levou e se fechou. Silêncio de rede nunca vira estado.
- Faixa só existe em projeto compartilhado; projeto normal não renderiza nem
  espaço reservado.

Atalhos e gabarito:

- Código pronto no estilo do repositório em `docs/design/handoff-rn/` (SharedDay,
  SharedDayBand, teste do modelo e `diffs.md` com as mudanças em arquivos
  existentes): copie para os destinos da tabela do pacote, valide e ajuste — não
  reescreva do zero o que já está lá.
- APROVAÇÃO VISUAL OBRIGATÓRIA, no escopo de UMA conta (decisão do dono, alinhada
  às regras fixas): `docs/design/refs/6a`, `6b` e `6c` são o gabarito exato da
  faixa. Tester e auditor abrem as imagens (Read) e comparam com screenshots os
  estados alcançáveis com um login — vazio, open, done e offline (6c e as partes
  correspondentes de 6a/6b). Correspondência exata ou CHANGES_REQUIRED citando
  imagem e diferença. Os estados que exigem SharedMemberDay de OUTRA conta
  (focusing, absent, allDone/sequência do grupo) validam por teste unitário do
  modelo + render fixado, e entram como observação "não verificável com um
  device" — nunca FAIL nem BLOCKED por eles.

O arquivo `docs/design/combinado-spec-visual.html` é referência visual para
humanos; não o abra durante a implementação — o pacote em markdown já contém tudo.
