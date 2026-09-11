Bug: abrir o link de convite com o app instalado e a sessão aberta não mostra
tela nenhuma de convite — e, se a pessoa já é membro, não mostra nada.

Relato do dono em 2026-09-10: "quando você abre um link de convite e tem o app
instalado e está inclusive logado, ele abre o app sem exibir a tela de usuário
que recebeu convite".

O que o código faz hoje, verificado:

- `ListsScreen.tsx:253-270` entra no espaço **na chegada**, sem perguntar, e
  só abre a folha de convite quando o `joinSharedList` **falha**. O comentário
  acima diz que isso é deliberado: "tocar no link é a resposta".
- A tela "você foi convidado" (`EntranceScreen` com `useInvitePreview`,
  `EntranceScreen.tsx:73,92`) só é montada deslogado, porque o `AuthGate` só
  existe quando `authStatus === 'signedOut'` (`App.tsx:663-675`).
- Se a pessoa **já é membro**, `joinByToken` devolve `alreadyIn`
  (`firestoreShareGateway.ts:552-556`), `acceptInvite` sai sem fazer nada
  (`shareTaskList.ts:264-267`), o app pula para a aba Espaços e **nada
  acontece na tela**. Esse é o caso mais confuso dos dois.
Reproduzido no aparelho em 2026-09-10 com o `deeplink` do driver: com sessão
aberta e o app na frente, entregar o link do convite do próprio espaço não
mudou nada na tela — nem folha, nem aviso, nem navegação. Silêncio total.

- A infraestrutura de deep link está correta e não é o problema: Universal
  Link iOS (`AppDelegate.swift:45-55`, entitlement `applinks:`), intent-filter
  Android com `autoVerify` (`AndroidManifest.xml:46-54`), `parseInviteToken`
  (`TaskList.ts:78-108`) e `useIncomingInvite.ts:34-42`.

Decisão do dono: entrar direto continua sendo o caminho, mas **nunca em
silêncio**. Quem tocou num link tem que ver o que aconteceu.

O que fazer:

1. Chegando um token com sessão aberta, mostre a prévia do convite antes de
   entrar: quem convidou, o nome do espaço e quantas pessoas já estão, com uma
   ação clara para entrar e uma para cancelar. Reaproveite o `useInvitePreview`
   que a `EntranceScreen` já usa; não crie um segundo caminho de leitura do
   convite.
2. A prévia não é a `EntranceScreen`: é uma folha sobre a aba Espaços, no
   padrão de folha do app. Enquanto a prévia carrega, o estado é de espera, e
   um convite inválido cai na mensagem que a folha de convite já tem
   (`copy.lists.joinInviteInvalid`).
3. **Já sou membro**: a folha diz que a pessoa já está nesse espaço e a ação
   leva direto para ele, aberto. Nunca ficar em silêncio.
4. Entrou: a folha fecha e o espaço abre — o mesmo destino de hoje, agora com
   a passagem visível. Um aviso curto confirma a entrada.
5. O token continua sendo consumido uma vez só. Hoje `onIncomingInviteHandled`
   é chamado **antes** do `joinSharedList` (`ListsScreen.tsx:259`); garanta
   que abrir o mesmo link duas vezes não empilha duas folhas e que virar a
   tela ou voltar do background não reabre a folha de um token já resolvido.
6. Deslogado nada muda: o `AuthGate` com a prévia continua igual.
7. Copy nos dois idiomas; a11y com a ação anunciável; tema claro e escuro.

Regras fixas valem. Não mexa na infraestrutura de deep link — ela está certa.
