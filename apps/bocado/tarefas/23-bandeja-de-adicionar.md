Adicionar um alimento não pode parecer que ainda falta confirmar. Hoje o "+" já
grava a entrada no diário, e mesmo assim a tela oferece um botão "Concluir" que
dá a entender que o registro só vale depois dele.

Pedido do dono em 2026-09-11, depois de usar o app no próprio aparelho: "está
meio estranho você adicionar um item e ele já foi adicionado. E aí parece que
você tem que clicar em pronto ou concluir pra ele realmente adicionar, só que
ele já foi adicionado." Ideias que ele mesmo levantou, sem fechar nenhuma:
deixar embaixo só o resumo do que foi adicionado, sem botão; voltar para a tela
do diário com uma animação do item entrando; ou — a que ele achou melhor —
continuar na própria tela de busca. Ele pediu explicitamente que a decisão seja
tomada com as skills de produto, design e UX, e não por palpite.

Uma troca de rótulo para "Pronto" chegou a ser feita e foi **desfeita a pedido
do dono**: o problema não é o nome do botão, é o botão existir onde nada está
pendente. Não reabra a troca de texto como solução.

Fatos verificados no código em 2026-09-11:

- `src/features/add-food/AddFoodScreen.tsx`: "Every '+' writes to the diary at
  once; closing by any route keeps it." Fechar pelo X, pelo voltar do Android
  ou pelo "Concluir" dá no mesmo — as entradas já estão gravadas.
- `src/components/AddTray.tsx` (design system §2.10): a bandeja entra com
  `SHEET_IN` no primeiro item. À esquerda, `trayLabel` — "1 item · 58 kcal" —,
  que ao toque expande a lista da sessão com editar e remover. À direita, o
  botão primário "Concluir", ligado a `done()`, que só faz `haptics.success()`
  e `navigation.goBack()`.
- `src/components/haptics.ts`: o sucesso é sentido uma vez por sessão, no
  "Concluir". Se o botão sair, a háptica precisa de outro lugar ou de outra
  decisão.
- O "+" da linha vira "✓" com `CONFIRM` e o leitor de tela anuncia a adição
  (`useAddSession.ts`). Remover na bandeja já oferece "Desfazer".
- O diário já tem a animação de entrada de uma linha nova
  (`useEntryArrival`, `ENTRY_IN`, 12 dp de subida), usada quando a busca fecha.
- `docs/DESIGN_SYSTEM.md` conta o "Concluir" da bandeja como um dos dois lugares
  onde o acento pode morar na busca (o outro é o "+"→"✓"). Se o botão sair, o
  orçamento de acento da tela muda.

Como decidir, e quem decide:

1. **Produto (`produto`)**: qual é o trabalho do usuário neste momento. Precisa
   ter certeza de que salvou, ver o que já foi adicionado nesta sessão e quantas
   kcal somou, e ter uma saída óbvia — nada disso exige confirmação. Decida a
   menor versão que resolve a queixa, com os critérios observáveis.
2. **Mercado (`marketing`)**: minere avaliações reais do MyFitnessPal, Yazio,
   Lifesum e FatSecret sobre o passo de adicionar e confirmar. Traga as frases
   dos usuários, não uma tabela de funcionalidades.
3. **Design (`design-director`, `mobile-design`)**: a direção visual e de
   motion da opção escolhida, dentro dos tokens.
4. **UX (`ux_auditor`, com `mobile-app-ux-auditor`)**: julga a tela entregue
   contra a queixa do dono.

Avalie pelo menos estas opções e registre por que cada descartada caiu:

- a) bandeja só com o resumo, sem botão, e a saída pelo X do cabeçalho e pelo
  voltar do Android;
- b) sem bandeja: continuar na busca, com o "✓" da linha e um resumo discreto
  da sessão em outro lugar;
- c) voltar ao diário a cada "+", com a animação de entrada que já existe;
- d) manter o botão com um verbo de fechar — só se as outras forem piores, e com
  o motivo escrito.

A preferência declarada do dono é continuar na tela de busca. Ela pesa, mas não
dispensa a avaliação.

Regras que valem:

- "Desfazer" e editar/remover itens da sessão não podem piorar.
- Motion só de `src/theme/motion.ts`, nada que atrase um toque, `ReduceMotion`.
- Acento em um lugar por tela; texto em `inkSubtle` é defeito.
- Nenhuma mudança no que é gravado ou quando é gravado: o "+" continua gravando
  na hora.
- Os roteiros adb que tocam "Concluir" precisam ser atualizados junto — são 15
  em `apps/bocado/adb/`, e os das tarefas 20 e 21 tocam em passo **obrigatório**.
- Registre a decisão em `docs/DECISIONS.md`, com as opções descartadas e o
  porquê, e atualize `docs/DESIGN_SYSTEM.md` §2.10.
- `npm run validate` verde.
