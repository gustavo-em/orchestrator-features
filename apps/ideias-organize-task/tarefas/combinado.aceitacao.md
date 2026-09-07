Critérios observáveis, na ordem da entrega:

1. `theme.ts` ganha `onAccentSubtle` e `onAccentLine` com os valores exatos do
   pacote, iguais nos dois modos; `ThemeColors` e o teste de brand atualizados.
2. `sharedDay()` é função pura com teste cobrindo as seis regras do pacote:
   ordem focusing→open→done→absent, `absent` com task null, membro sem dado
   remoto fora do array, desempate de múltiplas tarefas, convite pendente fora,
   sem Date.now/React/rede.
3. `MemberChip` aceita `inverted` (fundo `onAccent`, letra `accent`) sem mudar
   nenhum uso existente.
4. Na tela, a faixa mostra os quatro estados de linha conforme o pacote (glifo,
   cor e posição de cada um) e os três casos especiais: vazia, todos fecharam
   (com a sequência do grupo) e offline — cada um com a copy correspondente.
5. Geometria auditável no screenshot: fundo accent sangrando até as bordas,
   eyebrow maiúscula com tracking, separador fino entre linhas (nunca na
   primeira), botão fundo `text` com texto `accent`.
6. Copy nova nos dois idiomas com o teste de paridade verde; `dayBandAllDone`
   conjugado por contagem, sem número em literal.
7. A faixa é o primeiro filho do `Expanded` só quando `isShared(list)`; projeto
   não compartilhado abre sem faixa e sem espaço reservado.
8. Nenhuma informação de progresso individual de outra pessoa (peso, pontos,
   nível, sequência pessoal) aparece em tela nenhuma da fase 2.
9. ADR curta em `docs/adr/` registrando por que o placar não é do grupo.
10. `npm run validate` verde (formatação, lint, tipos, testes).
