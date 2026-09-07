REBRAND: o app passa a se chamar ALUZA. Esta tarefa é liderada pelo PRODUTO e
pelo MARKETING — use $produto, $marketing e $design-director intensamente antes
de qualquer código; dev e UX executam o que essa análise decidir.

Contexto de posicionamento (do dono, é a bússola de todas as decisões):

> "A propaganda do app vai ser para casais usarem, lembrarem das coisas e
> distribuírem suas tarefas — MAS o app não pode ficar nichado só nisso."

Ou seja: copy, nomes e interface acolhem o caso de uso casal/família em
primeiro plano sem excluir amigos, repúblicas ou uso solo.

O que executar:

1. NOME DO APP: displayName vira "Aluza" (Android strings/manifest; iOS quando
   houver). O applicationId `com.ideiasorganizetask` SÓ muda para `app.aluza`
   se `android/app/google-services.json` correspondente já existir no repo
   (o dono precisa registrar o app novo no console Firebase e baixar o json);
   sem o json novo, MANTENHA o id atual e liste a troca como pendência
   pré-publicação no summary. Nunca quebre o build por isso.

2. LOGO: o kit oficial está em `assets/brand/` (aluza-logo-* e aluza-symbol-*,
   SVG e PNG, incluindo versões primary/yellow-bg/dark-bg/mono). Use-o como
   fonte única — NÃO redesenhe o logo. Ícone do launcher: a versão de FUNDO
   BRANCO/CLARO com traço preto e detalhe amarelo (aluza-symbol-primary),
   gerada em todas as densidades (adaptive icon no Android: foreground =
   símbolo, background = branco/creme do kit).
   PROPORÇÕES SAGRADAS: nunca estique, achate ou redesenhe o símbolo para
   caber — ele mantém a proporção original do kit em TODOS os tamanhos; o
   ajuste é sempre por margem/padding ao redor (safe zone do adaptive icon),
   nunca por redimensionamento não uniforme. Partir dos SVGs para gerar os
   PNGs de densidade, com escala uniforme.

3. RENOMEAR A FEATURE "PROJETOS": produto + marketing decidem o nome novo da
   entidade compartilhada. Dicas do dono: "Espaços" é uma candidata; o nome
   deve remeter a organizar coisas junto, funcionar para casal E para amigos/
   família, e soar natural em pt-BR com equivalente bom em en-US. Julguem
   contra as avaliações de mercado mineradas (o que usuários chamam essas
   coisas) e registrem o racional. Aplicar o nome escolhido em TODA a copy:
   aba, títulos, sheets, convites, notificações, faixa do combinado — pt-BR e
   en-US com paridade. Nada de nome antigo sobrando (grep final).

4. SPLASH SCREEN ANIMADA com a logo nova: criativa e profissional — sugestão de
   direção (design_director decide a final): o símbolo "a" desenhando-se ou o
   raio de sol acendendo sobre o fundo creme do kit, 1.2-1.8s, sem travar o
   startup (animação roda enquanto o app carrega), respeitando reduced motion
   (logo estática). Fundo e cores exclusivamente do kit/theme.

5. ONBOARDING: os frames capturados mostram o nome antigo — regenere-os com o
   script versionado em assets/onboarding/ depois do rebrand aplicado, e ajuste
   as legendas para o nome novo da feature compartilhada.

6. TOM DA INTERFACE: onde a copy fala da feature compartilhada, produto/
   marketing podem ajustar frases para acolher o caso casal/família (ex.: no
   convite, nos estados vazios) SEM termos exclusivos de casal. Mudanças de
   copy listadas no summary com o porquê.

Regras fixas continuam valendo (linguagem sem culpa, cores, card em card).
