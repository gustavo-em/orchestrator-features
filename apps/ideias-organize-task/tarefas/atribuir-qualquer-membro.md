Qualquer pessoa do espaço passa a poder colocar outra pessoa numa tarefa.

Relato do dono em 2026-09-10: "não é possível associar outra pessoa a uma
tarefa, só tem como clicar no botão 'entrar na tarefa'. Caso eu não esteja
vendo isso porque a criadora do grupo foi minha namorada, considere colocar
para qualquer um do espaço."

A leitura dele está certa e a causa é o modelo de permissão, não um defeito:

- `domain/TaskAssignment.ts:73-79` — `canToggleAssignment` devolve verdadeiro
  só para o dono ou para quem mexe em si mesmo.
- `docs/firebase/firestore.rules:232-242` — `isOwnerAssignmentUpdate` (dono
  livre) e `isSelfAssignmentUpdate` (membro só o próprio uid).
- A UI reflete isso: `TaskAssignSection.tsx:73-148` mostra a lista de membros
  para o dono e um único botão "Entrar na tarefa" (`task-assign-self`) para
  os outros.

Quem testou era membro, não dona do espaço — por isso só viu o botão. O dono
decidiu mudar o modelo: **qualquer membro com permissão de edição pode colocar
e tirar qualquer pessoa do espaço de uma tarefa.** Espaço compartilhado aqui é
entre pessoas que já confiam umas nas outras; o atrito não paga.

O que fazer:

1. `canToggleAssignment` passa a permitir qualquer membro que possa editar o
   espaço. Quem é **viewer** continua sem atribuir ninguém, nem a si mesmo —
   confira como o papel viewer é lido hoje e mantenha essa porta fechada.
2. `docs/firebase/firestore.rules`: a escrita de `assignments` passa a valer
   para membro editor sobre qualquer uid do espaço, continuando a recusar
   viewer e quem não é membro. Publicar é **passo manual do dono**: liste no
   summary, não bloqueie por isso.
3. UI: a lista de membros com alternância por pessoa
   (`task-assign-<personId>`) passa a aparecer para todo membro editor, com o
   texto que já existe ("Colocar <nome> na tarefa" / "Tirar <nome> da
   tarefa"). O botão "Entrar na tarefa" continua, como atalho para si mesmo,
   no topo da lista.
4. A seção só existe hoje na folha de edição, e só editando
   (`QuickCaptureSheet.tsx:1091-1092`). Mantenha assim: não invente
   afordância nova na linha da tarefa nesta fatia. A pilha de iniciais de quem
   já pegou continua como está (`ListsScreen.tsx:1112-1120`).
5. Um espaço só seu não ganha seção nenhuma — `assignment` continua nulo fora
   de espaço compartilhado.
6. Teste de domínio cobrindo a matriz: dono, editor e viewer, agindo sobre si
   e sobre terceiro. Atualize `__tests__/taskAssignment.test.ts`.
7. Atualize `docs/design/projeto-compartilhado.md` e o que mais descrever o
   modelo antigo, e registre a mudança de decisão com a data e o porquê.

Regras fixas valem. Validação com duas contas não cabe num device só: a
matriz de permissão é teste, e a tela é evidência com a conta que houver.
