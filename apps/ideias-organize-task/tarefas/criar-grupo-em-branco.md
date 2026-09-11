Criar do zero — grupo ou espaço — tem que ser a porta da frente, não a última
opção da grade.

Relato do dono em 2026-09-10: "quando você vai criar um novo grupo, fica pouco
evidente que dá para criar o grupo em branco e parece que você fica limitado
àquelas opções".

Antes de implementar, saiba onde está cada coisa — o relato mistura duas telas
e as duas têm um problema, mas diferentes:

- **Folha de grupo** (`GroupEditorSheet.tsx`): não tem predefinição nenhuma. O
  campo de nome livre já é o primeiro elemento (`:212-232`, autoFocus) e o
  botão só depende do nome (`usable = name.trim().length > 0`, `:110`). O que
  parece limitar é a **grade de ícones marcada "· obrigatório"**
  (`taskCopy.ts:891-892`) logo abaixo do nome, mesmo o ícone já vindo
  adivinhado por `guessGroupIcon` (`:108-109`). A pessoa lê "obrigatório" e
  entende que precisa escolher ali.
- **Folha de espaço** (`ListNameSheet.tsx`): aqui existe mesmo uma grade de
  seis modelos, e "Do zero" é o **último** cartão
  (`models/projectTemplates.ts:7-14`), com a folha abrindo já na grade
  (`:115`) e o destaque inicial em "Casa" (`:119-120`).

**Achado durante o teste desta leva, em 2026-09-10, e que muda o peso da
tarefa:** o botão "Novo grupo" simplesmente **não está alcançável** num espaço
que ainda não tem tarefa solta. O testador do orquestrador registrou o nó
`add-group-casa` com limites `[1064,1245][1013,1351]` num aparelho de 1080 de
largura — largura negativa, fora da tela, impossível de tocar.

A causa está em `ListsScreen.tsx:1762-1789`: `EndActions` é uma linha
(`flex-direction: row`, `gap: 18`) com dois filhos que não encolhem. Quando o
espaço não tem tarefa solta, o primeiro botão usa o rótulo longo
("Adicionar primeira tarefa", `copy.lists.addFirstTask`) em vez do curto
("Adicionar tarefa"), a soma passa da largura disponível e o segundo botão é
empurrado para fora. É o pior caso possível: o espaço recém-criado, que é
justamente quando alguém vai criar o primeiro grupo. O único caminho que
sobra é o segmento "Grupo" no cabeçalho da folha de captura — que é
exatamente o caminho que ninguém encontra.

Conserte isto primeiro; sem ele o resto da tarefa não tem como ser
verificado na tela.

O que fazer:

0. `EndActions` para de estourar: os dois botões cabem lado a lado em 360 dp
   com o rótulo longo, ou a linha quebra em duas, ou o rótulo do primeiro
   botão deixa de crescer. Escolha uma e diga por quê. Nada de `flex-shrink`
   que corte o texto no meio. Confira com o texto grande de acessibilidade,
   nos dois idiomas (em inglês "Add first task" e "New group" também têm de
   caber) e num espaço sem tarefa nenhuma.

1. Folha de grupo: o ícone deixa de se anunciar como obrigatório. Ele já vem
   sugerido pelo nome; a grade vira escolha opcional, com rótulo que diga isso
   ("Ícone" e, se precisar, "sugerido pelo nome"). O botão de criar continua
   dependendo só do nome. Nada muda na ordem dos elementos — o nome já é o
   primeiro.
2. Folha de espaço: criar do zero passa a ser evidente sem esconder os
   modelos. O caminho livre (o nome) vem primeiro; os modelos ficam abaixo,
   como atalho opcional, e nenhum deles nasce destacado. Se a grade continuar
   antes por decisão de desenho, então "Do zero" é o **primeiro** cartão e o
   destaque inicial é dele — não "Casa".
3. Nos dois casos, escrever o nome e confirmar tem que bastar. Nenhum campo
   além do nome bloqueia a criação, e isso deve estar visível sem rolar.
4. Sem tela nova, sem passo novo, sem mudar o número de toques do caminho
   feliz de quem quer um modelo.
5. Copy nos dois idiomas; `Do zero` / `From scratch` continuam com o mesmo
   nome se continuarem existindo.
6. Confira o segundo caminho de criação de grupo, o segmento "Grupo" no
   cabeçalho da folha de captura (`QuickCaptureSheet.tsx:636-650`), para que a
   mesma clareza valha ali.

Regras fixas valem, em especial nada de card dentro de card e o filete como
separador de seção.
