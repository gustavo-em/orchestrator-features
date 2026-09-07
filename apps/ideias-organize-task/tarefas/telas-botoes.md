Correção visual focada: botões com texto estão quebrando linha e desalinhados
horizontalmente em várias telas.

Escopo:

- Varra as telas do app (login, cadastro, recuperação, sheets de compartilhar e
  entrar, perfil, diálogos) atrás de botões cujo texto quebra em duas linhas,
  trunca, ou cujo conjunto de botões não alinha na horizontal (alturas diferentes,
  baselines tortas, espaçamentos desiguais).
- Causa provável: larguras fixas, padding insuficiente para o texto pt-BR (mais
  longo que en-US), ou containers row sem alinhamento consistente. Corrija na
  raiz (componente de botão / layout), não tela a tela com números mágicos.
- Texto de botão nunca quebra: encolha a fonte um passo pelo próprio type scale OU
  aumente a largura disponível — decisão por componente, consistente no app todo.
- Não redesenhe nada além disso: mesmo estilo, mesmas cores, mesmos tokens. É
  tarefa de correção, não de direção visual.
