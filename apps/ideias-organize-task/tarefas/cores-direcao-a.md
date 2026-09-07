Implementar a Direção A do discovery de cores, aprovada pelo dono (brief do run
2026-09-01T22-03-52): limpar os amarelos de apoio para o acento da marca viver
sozinho. O acento #FFC63D, onAccent e accentInk são INTOCÁVEIS.

Siga os passos do brief, na ordem, cada um como mudança pequena e verificável:

1. `src/app/theme/theme.ts` (lightTheme) — 4 tokens de superfície:
   - background: #FFFBF0 → #F4F3EF
   - border: #E9DDC2 → #E3E1DB
   - borderSubtle: #EFE2C8 → #ECEAE4
   - cardElevated: #FFE6A0 → #FFF3D0
   Tema escuro intocado.
2. Validar em tela (Tarefas, Projetos, Você e a sessão de foco) antes de seguir:
   o julgamento é visual — o fundo deve ler como neutro levemente quente, o
   acento amarelo deve saltar mais que antes, nada deve parecer "lavado".
3. muted: #8A7F6D → #6F6656 (corrige a falha AA de 3.7:1 para ~5.2:1 no texto de
   apoio) e o estado selecionado do chip de filtro em TodayScreen (GroupingButton):
   selecionado = fill #FFF3D0 + borda 1.5px accent + label peso 600 em accentInk;
   não selecionado = fill card + borda border. A seleção passa a se ler por
   forma, não por cor fraca.
4. Opcional, avaliado isolado no final: focus #FFEFCB → #FFF4DA — só se a tela
   de foco não perder a intenção do amarelo de fundo dela.

Atenção aos gabaritos: docs/design/refs/6a-6f foram capturados com a paleta
antiga — nesta tarefa, o critério visual é o BRIEF, não os gabaritos; divergência
de fundo/borda contra os PNGs antigos é esperada e não é achado. Geometria e
estrutura continuam valendo.

Fora do escopo: qualquer outro token, qualquer mudança de layout, o tema escuro,
e a variante de chip com fill accent (registrada como não recomendada).
