Decisões já fechadas para o Bocado. Valem em toda tarefa.

## Contexto do dono e arquitetura (decida sozinho por isto)

- O dono é **desenvolvedor solo**, sem equipe, sem CI e sem backend próprio. Nunca
  proponha serviço, servidor, fila ou pipeline que exija time.
- O app é **offline-first e sem conta**: nada de login, cadastro, sincronização ou
  Firebase nesta fase. Dados ficam no device (SQLite via `@op-engineering/op-sqlite`,
  preferências via `react-native-mmkv`). Rede só para buscar alimento em provedor
  externo, sempre com fallback offline.
- Stack fixa: React Native 0.87 (bare, sem Expo), TypeScript estrito, React
  Navigation 7 (native-stack + tabs se houver), Reanimated 4 + Worklets, Gesture
  Handler 2.x, FlashList 2, react-native-svg, `lucide-react-native` para ícones,
  `react-native-haptic-feedback`. Não adicione biblioteca de UI pronta (Paper,
  Tamagui, NativeBase, gluestack) nem outra de animação. Nova dependência nativa
  só com motivo escrito no summary.
- Device de referência: **Samsung Galaxy J6 (Android 10, 2 GB RAM, 720x1480, 320 dpi)**.
  Tudo precisa ficar fluido nele: listas virtualizadas (FlashList), item de lista
  memoizado, animação só de `transform`/`opacity`, sem blur pesado, sem sombra em
  item de lista, imagem só quando indispensável.
- Idiomas: pt-BR é o idioma primário; en-US é obrigatório em toda string nova. Copy
  fica em `src/i18n/` (tabelas tipadas), nunca literal na tela. Código, commit,
  comentário e documento do repositório são escritos em inglês.
- `npm run validate` (prettier + eslint + tsc + jest) precisa ficar verde ao fim de
  cada tarefa. Teste unitário novo para regra de domínio (cálculo, ranking, parser),
  não para tela.

## Produto (o que o app é)

- Um contador de calorias cujo diferencial é **adicionar comida em segundos com uma
  interface calma e premium**. Cada decisão de tela se mede por: quantos toques até
  o alimento estar na refeição, e quão claro fica o que foi adicionado.
- Quatro refeições fixas no dia, nesta ordem e com estes nomes em pt-BR:
  **Café da manhã**, **Almoço**, **Café da tarde**, **Jantar** (en-US: Breakfast,
  Lunch, Afternoon snack, Dinner). Não crie refeição customizada nesta fase.
- Nutrientes do MVP: **kcal, carboidratos, proteínas, gorduras** sempre; fibra,
  açúcar e sódio quando a fonte tiver. Emenda do dono em 2026-09-10 (tarefa 20):
  entram **cinco minerais (ferro, cálcio, magnésio, potássio, zinco), fibra e
  sódio no total do dia**, opt-in, em `ink`, sem percentual; vitaminas continuam
  fora (cobertura insuficiente), e nada de micro por item na folha de porção.
  Nada de água, exercício, peso corporal ou gráfico semanal nesta fase.
- Meta diária: kcal e distribuição de macros, editável em "Metas". O app **nunca**
  usa linguagem de culpa: nada de "você estourou", vermelho alarmante ao passar da
  meta ou emoji de reprovação. Passar da meta é informação, apresentada com a mesma
  calma do resto.
- Sem paywall, sem anúncio, sem pedido de avaliação, sem onboarding longo nesta
  fase. Primeiro uso chega ao diário em no máximo uma tela.

## Fonte de dados de alimentos (contrato fixo)

- Todo alimento que entra na UI passa pelo contrato `NormalizedFood` e pela
  interface `FoodProvider` definidos em `docs/FOOD_DATA_CONTRACT.md` e
  `src/domain/food/`. Provedor novo implementa a interface; a UI nunca conhece o
  formato bruto de nenhuma API.
- Base offline embarcada (TACO + medidas caseiras) é a fonte primária e responde
  sem rede. Provedores online complementam, com cache local do que foi visto.
- Busca é **insensível a acento e caixa** ("pao" encontra "pão"), por prefixo de
  palavra, e devolve resultado em menos de 100 ms para a base local.
- Atribuição de licença de cada fonte aparece na tela "Fontes de dados" — não
  remova nem esconda.

## Textos fixos (o tester navega por eles; não renomeie)

- Tela inicial: título **"Hoje"** quando o dia é o atual; ação de adicionar em
  cada refeição com **"Adicionar em {refeição}"** no texto ou no rótulo de
  acessibilidade (desde a tarefa 18 é um anel "+" com o rótulo; o tester casa
  `content-desc`); ação de metas com texto **"Metas"**.
- Tela de busca: campo com placeholder **"Buscar alimento"**; seções
  **"Recentes"**, **"Frequentes"**, **"Favoritos"**; botão de confirmação
  **"Adicionar"**; ação de desfazer **"Desfazer"**.
- Todo controle interativo tem `accessibilityLabel` e alvo ≥ 48 dp.

## Design (invariantes do sistema)

- Tokens vivem em `src/theme/` e são a única fonte de cor, tipo, espaço, raio e
  motion. Tela nunca inventa hex, tamanho de fonte ou duração soltos.
- Tema claro e escuro são obrigatórios em toda tela nova, seguindo o sistema.
- Motion: vocabulário único em `src/theme/motion.ts` (durações 150–350 ms, easing
  consistente, springs nomeados, `ReduceMotion.System` em tudo). Nada de bounce
  gratuito, nada que atrase um toque.
- Nada de card dentro de card; seção se delimita por título, espaço e um filete
  fino quando precisar. Sombra só em superfície flutuante (sheet, snackbar).
- Cor semântica (erro/sucesso) não é acento; acento em um lugar por tela.
- Ícones só de `lucide-react-native`, mesmo peso de traço em toda a UI. Sem emoji
  como ícone.

## Marca e design system (fechados; não reabra)

- `docs/BRAND.md` e `docs/DESIGN_SYSTEM.md` são o contrato visual. O símbolo
  ("tigela e bocado"), os ícones gerados por `scripts/generate-brand-assets.mjs`,
  a paleta "Papel" e a dupla Fraunces 144 Soft + Inter não são discutidos por
  tarefa. `docs/design/telas.html` é a referência de fidelidade das cinco telas.
- Três níveis de tinta por obrigação de contraste: `ink` (≥ 12:1) para o que se
  lê primeiro, `inkMuted` (≥ 4,5:1) para qualquer texto legível — inclusive
  placeholder e badge —, `inkSubtle` (≥ 3:1) só para contorno de controle,
  desabilitado e alça da folha. Texto corrido em `inkSubtle` é defeito.
- Acento índigo em **um** lugar por tela: ação primária, estado ativo, o "✓".
  Nunca como decoração, nunca em barra de macro.
- Componentes canônicos da seção 2 do design system (botão, chip, linha de
  resultado, entrada do diário, cabeçalho de refeição, bloco hero, barras,
  bandeja, snackbar, folha, badge, campo de busca, faixa de dias, stepper,
  cabeçalho de tela) têm anatomia e medidas fixas: reutilize-os, não invente
  variante. Um componente novo entra em `src/components/` com o mesmo nível de
  especificação.
- Ícones só de `src/theme/icons.ts` (lucide, traço 1,75; 20 dp em linha, 24 dp
  em ação). Nada de emoji, nada de ícone de outro pacote.
- Tema escuro obedece à seção 8 (superfície +4% por elevação; acento
  `#93A0F2`; snackbar em `inverseSurface`).
- Antes de encerrar uma tarefa de tela, passe pelo checklist da seção 9 do
  design system e cite no summary o que foi verificado.

## Device de teste (fato, não decisão)

- O Galaxy J6 roda One UI com o modo noturno **travado** para o shell: o passo
  `night` do driver não muda o tema do sistema. O aparelho está configurado em
  modo claro; screenshots são sempre do tema claro. Ausência de evidência do
  tema escuro é observação ("não verificável neste device"), nunca FAIL. O tema
  escuro é validado por teste unitário dos tokens e por revisão do código.

## Como trabalhar

- Prefira mexer no que existe a criar estrutura nova; siga `docs/ARCHITECTURE.md`.
- Especificação detalhada de cada tarefa está em `docs/specs/`; leia a da tarefa
  na fase de planejamento.
- Passo que só o dono pode executar (loja, conta de API) entra no summary como
  passo manual — nunca BLOCKED por isso, nunca stub silencioso.
- Não faça refactor de produto numa tarefa de polish, nem polish numa tarefa de
  dado.

## Build de teste e a porta 8081 (fato, não decisão)

`npm run android:test-build` apaga o bundle antigo de `assets/` e instala o
build **release** (`installRelease`). Isso mudou no ciclo da tarefa 23
(`af6237e`) e **deve ficar assim**: um build release não conversa com Metro, então
um Metro de outro projeto na porta 8081 não consegue trocar o JavaScript do
Bocado. Com o build de debug, o `installDebug` religava `adb reverse tcp:8081`,
o Bocado carregava o bundle do outro projeto e morria numa tela vermelha que
nomeia um módulo nativo que ele não tem (`'RNBackgroundFetch' could not be
found`). Foi o que derrubou os três primeiros ciclos de tela da tarefa 23.

Consequências:

- não volte o script para `installDebug`;
- o app instalado não é debugável, então `adb shell run-as` não funciona nele —
  evidência de arquivo interno tem de vir da tela ou de teste;
- nunca pare nem mexa num Metro que esteja na 8081: ele é do dono, que usa o
  mesmo aparelho em outros projetos;
- se a tela vermelha aparecer com um módulo que o Bocado não usa, o que está
  instalado é um build de debug, e a causa é esta.
