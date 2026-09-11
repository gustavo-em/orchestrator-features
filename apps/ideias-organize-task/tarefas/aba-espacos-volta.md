Bug: dentro de um espaço, tocar na aba Espaços não volta para a lista de
espaços.

Relato do dono em 2026-09-10: "quando você está dentro de um espaço e clica na
aba espaços no menu inferior, ele não volta para a listagem de espaços; precisa
ir para a aba tarefas e voltar, ou voltar com a setinha no topo".

Causa confirmada:

- `useAppViewModel.ts:115` — `selectTab: (tab) => setActiveTab(tab)`. Tocar na
  aba que já está ativa chama `setActiveTab` com o mesmo valor, o React
  desiste do render e nada acontece.
- O espaço aberto é estado interno da tela: `ListsScreen.tsx:162`
  (`openListId`) e `:188` (`openGroupId`), limpos só por `toggleOpen`
  (`:382-387`) e `leaveGroup` (`:393-396`).
- Trocar de aba e voltar funciona por acidente: `App.tsx:374` desmonta a
  `ListsScreen` quando a aba não é a ativa, e o estado morre junto.
- A seta do topo funciona porque chama `toggleOpen` (`ListsScreen.tsx:1565`).

Reproduzido no aparelho em 2026-09-10: dentro do espaço Casa, um toque na aba
Espaços não mudou uma linha da árvore de UI — o botão "Voltar para os
espaços" continuou lá.

O que fazer:

1. Tocar na aba já ativa passa a ser um evento, não um no-op. Leve o sinal da
   `TabBar` até a tela: um contador ou timestamp de "aba re-tocada" no view
   model do shell, entregue como prop para a tela da aba ativa. Não use
   variável global nem `DeviceEventEmitter`; segue a arquitetura de
   `docs/ARCHITECTURE.md`.
2. Na `ListsScreen`, esse sinal volta um nível por vez, do mais fundo para o
   mais raso: dentro de um grupo → volta para o espaço; dentro de um espaço →
   volta para a lista de espaços; já na lista → rola para o topo, sem piscar
   nada.
3. **Mesma correção na aba Você**, que tem o defeito idêntico (`App.tsx:117`,
   `youRoute`): estando numa tela interna do perfil, tocar em "Você" volta
   para a raiz do perfil. A aba Tarefas rola para o topo.
4. Nenhuma folha aberta é fechada por esse toque: se há folha na frente, o
   toque na aba não faz nada além do que já faz hoje.
5. Acessibilidade: o rótulo da aba não muda; o retorno é anunciado pela troca
   de tela, como já acontece com a seta do topo.

Regras fixas valem. Sem mudança visual na barra de abas.
