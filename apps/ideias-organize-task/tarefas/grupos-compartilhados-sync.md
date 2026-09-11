Bug: o grupo criado num espaço compartilhado nunca chega na outra pessoa, e a
tarefa criada dentro dele aparece solta para ela.

Relato do dono em 2026-09-10, testando com uma segunda pessoa num espaço real:
"criamos um espaço junto e criamos um grupo, só quem criou o grupo é que via
ele; o outro não via mesmo fechando e abrindo o aplicativo, e quando se criava
tarefa dentro do grupo ela aparecia como tarefa fora do grupo".

A causa está confirmada no código, é uma linha, e o resto desta tarefa é
garantir que ela não volte.

`src/features/tasks/infrastructure/sharing/firestoreShareGateway.ts:463-475`,
no `push`:

```
updateMask: ['name', 'color', 'icon', 'groups', 'tasks', 'updatedAtMs'],
fields: { name, color, icon, tasks, updatedAtMs }   // sem `groups`
```

`groups` está na máscara e **não** está no corpo. No PATCH do Firestore REST,
campo listado na máscara e ausente do corpo é **apagado**. O commit `dcf7738`
("groups travel with the space") acrescentou `groups` ao `createLink` e à
máscara do `push`, mas esqueceu o campo no corpo.

A cadeia inteira do sintoma, já verificada:

1. `createLink` grava os grupos certos (`firestoreShareGateway.ts:283`).
2. Qualquer mudança local dispara `workspace.committed` e o push
   (`createSharePushSubscriber.ts:51-53`); criar grupo emite esse evento
   (`manageTaskGroup.ts:85`).
3. O push apaga `groups` no servidor.
4. No pull do outro aparelho, `documentToProject` lê `fields.groups ===
   undefined` (`firestoreShareGateway.ts:166-168`).
5. O merge trata `undefined` como "cliente antigo, não mexa"
   (`shareTaskList.ts:192-207`): `knowsGroups` fica falso, ela mantém os
   grupos locais (nenhum) **e o `groupId` remoto é descartado** em favor do
   local (`null`) — por isso a tarefa aparece solta.
6. Sem o grupo, `isLooseInSpace` (`domain/TaskGroup.ts:228-235`) devolve
   verdadeiro e a tarefa cai na lista solta (`ListsScreen.tsx:1290-1293`).

O que fazer:

1. Corrigir o `push`: o corpo passa a levar `groups: list.groups ?? []`. Nada
   mais muda no formato — as regras já aceitam `groups` no update de conteúdo
   (`docs/firebase/firestore.rules:141-144`), então não há passo de console.
2. **A razão de o teste não ter pego é o mock**: `inMemoryShareGateway.ts:99-105`
   guarda a lista inteira, grupos inclusive, então ele nunca reproduz a
   semântica do PATCH. Faça o mock (ou um duplo novo, mais perto do REST)
   respeitar a máscara: campo na máscara e fora do corpo é apagado; campo fora
   da máscara é preservado. Depois disso o teste de ida e volta abaixo falha
   sem a correção e passa com ela.
3. Teste de ida e volta: espaço com grupo e tarefa dentro dele → push → pull
   num workspace vazio → o grupo existe e a tarefa continua com o `groupId`.
   Um segundo teste garante que qualquer campo da máscara está presente no
   corpo (varra a máscara contra as chaves de `fields`), para que o próximo
   campo novo não repita o erro.
4. Confira o mesmo par máscara/corpo nas outras escritas do gateway
   (`createLink`, entrada de membro, remoção, renomear) e corrija se houver
   outra divergência. Reporte no summary o que foi conferido.
5. Recuperação de quem já perdeu: um espaço que já está no servidor sem
   `groups` volta ao normal no primeiro push de quem tem os grupos localmente.
   Não escreva migração; diga isso no summary, com a instrução prática (quem
   criou o grupo abre o app e faz qualquer mudança no espaço).
6. Ponto frágil vizinho, não é para consertar nesta tarefa, é para registrar:
   `acceptInvite` (`shareTaskList.ts:281-285`) sufixa `task.id` com
   `@<token4>` e **não** sufixa `groupId`; hoje funciona porque
   `sanitizeGroups` preserva o id do grupo, mas o acoplamento merece uma linha
   em `docs/design/projeto-compartilhado.md`.

Regras fixas valem. Validação com duas contas não é possível num device só:
o teste de ida e volta é a prova, e a observação de campo entra como tal.
