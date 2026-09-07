Onboarding de primeira abertura bem feito, com animações Lottie entre telas,
exemplificando como usar o aplicativo.

Decisões fechadas:

- 3 a 4 telas no máximo, cada uma mostrando UM conceito com exemplo concreto:
  (1) leve poucas tarefas para o dia (o trio), (2) conclua e veja o progresso,
  (3) projetos compartilhados com amigos, (4) opcional: foco. Copy nos dois
  idiomas, tom das regras fixas (nunca culpar o usuário).
- Biblioteca lottie-react-native (módulo nativo: declare a dependência e deixe o
  rebuild para o driver). Animações: se não houver assets do dono, CRIE arquivos
  .json Lottie simples e próprios (formas do design system animadas — fade,
  slide, progressão) versionados em assets/lottie/; nada de placeholder vazio nem
  de baixar asset de terceiro em runtime.
- Navegação: swipe + botões próxima/pular; "Pular" sempre visível; último passo
  leva ao cadastro/login. Onboarding aparece só na primeira abertura (flag
  persistida) e nunca de novo — com um caminho de rever em ajustes.
- Respeite reduced motion: com ele ativo, as Lottie viram estáticos.
- Visual segue o design system (tokens, tipografia, tema claro/escuro).
