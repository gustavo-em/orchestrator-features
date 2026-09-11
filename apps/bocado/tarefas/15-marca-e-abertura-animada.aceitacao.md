1. O símbolo novo está em `assets/brand/` como SVG e é legível em 24 dp. A
   evidência de tela é o símbolo **dentro do aplicativo** em 24 dp; o ícone de
   lançador não é capturável pelo driver, que abre o aplicativo direto, então
   para ele vale o PNG gerado em `android/app/src/main/res/mipmap-*` conferido
   no arquivo, não uma captura de tela do lançador.
2. Os ícones de todas as densidades e o ícone adaptativo são gerados do mesmo
   SVG por um script versionado, não desenhados um a um.
3. `docs/BRAND.md` traz a construção, os mínimos, os usos proibidos, e a marca
   anterior com o motivo da troca.
4. A abertura anima o símbolo e entra em "Hoje" sem piscar fundo de outra cor,
   provado nos dois temas.
5. O tempo do toque no ícone até "Hoje" utilizável no J6 é medido antes e
   depois e não piorou. O número dos dois lados vai no summary.
6. Com "reduzir movimento" ligado no aparelho, a marca aparece sem percurso e
   a abertura continua funcionando.
7. Só `transform` e `opacity` são animados: um grep prova que nenhuma
   propriedade de layout entrou.
8. `npm run validate` verde e nenhuma dependência nova para a splash sem que a
   tarefa justifique o peso dela no J6.

## Duas armadilhas de coleta, nomeadas para não virarem achado falso

1. **A faixa de debug do React Native** fica por cima do rodapé, por volta de
   `[20,1239][700,1334]` no J6, e come toques mirados por coordenada nessa
   região. Um toque que cai nela não é defeito do aplicativo: mire pelo texto
   ou pelo `testID`, ou role a tela antes.
2. **`keyevent 4` em "Metas" volta para "Hoje"**, não fecha uma seção. Se os
   passos seguintes esperam estar em "Metas", eles precisam reabrir "Metas".

## Como fechar o critério 5 sem adivinhação

`scripts/measure-launch.sh` já existe no repositório. As duas medidas são:

- `c27ed40` (antes desta tarefa) e o commit desta tarefa;
- **mesma variante de build** nas duas, instalada no J6;
- mediana de pelo menos 5 aberturas frias em cada, e as duas medianas no
  summary com a variante declarada.

Sem os dois números, o critério 5 não fecha — é o único critério desta tarefa
que nenhum outro portão consegue substituir por leitura de código.

## O critério 5 sai do laço

Correção da instrução anterior, depois de o implementador apontar a
contradição — e ele estava certo. Nenhum agente deste laço consegue fechar o
critério 5: o implementador é proibido de rodar ADB e Gradle, e o testador de
tela não constrói dois commits. Também não há saída pelo `--parse`: nenhuma
coleta anterior guardou logcat, então não existe linha de base gravada.

Portanto: **o critério 5 não bloqueia esta tarefa.** As duas medidas de TTI
são do dono, fora do laço, com `scripts/measure-launch.sh` nos dois commits e
a mesma variante de build. Elas entram depois em
`docs/specs/15-abertura-tti.md`.

O que continua sendo do laço, e continua bloqueando: a marca a 24 dp dentro do
aplicativo, a abertura sem piscada nos dois temas, "reduzir movimento" sem
percurso, e o grep provando que só `transform` e `opacity` animam.

Não invente número de TTI e não relate estimativa como medição.

## O critério 5, resolvido com o número na mão

Medido com worktree de base isolado em `c27ed40` e a mesma variante
(`installDebug`, `armeabi-v7a`), `scripts/measure-launch.sh`, 5 partidas frias
por rodada com force-stop antes de cada uma, e — o que decide a qualidade do
experimento — **as instalações intercaladas**, para a deriva térmica e o ART
não caírem de um lado só:

- **antes (`c27ed40`):** mediana 3212 ms, 35 partidas
- **depois (esta árvore):** mediana 3215 ms, 25 partidas

Diferença de 3 ms, com as rodadas dos dois lados se sobrepondo inteiras. Não há
custo mensurável: a abertura animada não atrasa nada.

Uma advertência para quem repetir isto: uma série sequencial — todas as "antes"
e depois todas as "depois" — mostrou algo perto de +30 ms, e esse número era
deriva, não a animação. Só a intercalação separa uma coisa da outra. Foi
exatamente esse o erro que a primeira leitura desta tarefa cometeu.

O critério fica assim: a abertura não pode piorar **mais de 100 ms** contra
`c27ed40`, medida com instalações intercaladas, e os números vão no summary e
em `docs/specs/15-abertura-tti.md` com as duas séries e a variante declarada.

## O disco na abertura: decidido, para parar o vai e vem

Os ciclos 2 e 3 se desfizeram — o 2 pôs o disco na janela da activity, o 3
reverteu para cor — e quatro coletas seguidas mostram a abertura inteiramente
em osso, sem marca nenhuma. Isto encerra a discussão.

**O mecanismo, verificado nos arquivos:**

- O manifesto declara a activity com `Theme.App.SplashScreen`, que tem
  `windowBackground = @drawable/splash_background` — o disco. Essa é a janela
  de *preview*, desenhada pelo sistema antes de a activity existir.
- `MainActivity.onCreate` chama `setTheme(R.style.AppTheme)` **antes do
  primeiro quadro**. A partir daí a janela da activity vale, e ela tem
  `windowBackground = @color/splash_background` — sem disco.
- No J6 o React Native leva cerca de três segundos até o primeiro quadro. A
  janela de preview sai muito antes disso.

Logo, a afirmação do ciclo 3 — "a starting window segura o disco até o primeiro
quadro da activity" — é falsa neste caminho: a janela de preview é substituída
quando a *activity* pode desenhar, não quando o *React Native* pode. O que fica
no meio, por três segundos, é a cor lisa.

**Decisão: `Base.AppTheme` volta a ter `windowBackground = @drawable/splash_background`**,
como no ciclo 2.

Sobre os 28 ms que motivaram a reversão: aquela comparação (3240 contra 3212)
foi feita em séries sequenciais, o mesmo método que nesta própria tarefa
produziu um falso +30 ms depois desmentido pela medição intercalada. Se alguém
quiser refazer a conta, refaça intercalando. E mesmo que os 28 ms existam, a
troca é 28 ms contra três segundos de tela sem marca — não é um dilema.

**Evidência que fecha:** uma captura tirada entre o lançamento e o primeiro
quadro do React Native mostrando o disco. Se as capturas em 0 ms, 700 ms e
2000 ms saírem todas em osso liso outra vez, o critério não fechou.

### Correção: o caminho é livre, a evidência é que manda

O ciclo 4 achou uma rota melhor do que a que eu prescrevi acima e ela deve
prevalecer: em vez de pôr a layer-list em `Base.AppTheme`, tirou o
`setTheme(R.style.AppTheme)` de `MainActivity.onCreate` e deixou a activity com
`Theme.App.SplashScreen` a vida inteira. Como esse tema estende `AppTheme`,
barras, ícones claros e o fundo de campo de texto resolvem igual, e o disco
fica na janela até o primeiro quadro sem custo nenhum em `Base.AppTheme`.

Portanto **não** exija a mudança em `Base.AppTheme`. O que vale é o resultado:
uma captura entre o lançamento e o primeiro quadro do React Native mostrando o
disco. Qualquer rota que produza isso fecha o critério.

Um resto a limpar: o comentário que sobrou em `values/styles.xml` ainda fala de
`setTheme(AppTheme)` em `MainActivity`, que não existe mais, e repete a
afirmação já desmentida de que a starting window segura o disco até o primeiro
quadro. Corrija o comentário para descrever o que o código faz agora.

### Ciclo 5: não remeça: feche

O achado do ciclo 4 pede remedir o TTI antes de fechar. O pedido é justo, mas
não é necessário para a decisão, e este é o último ciclo. Faça o barato e
deixe o caro comigo:

- **A decisão já tem teto.** O critério é "não piorar mais de 100 ms". A única
  estimativa que existe para a layer-list na janela é ~28 ms, e ela vem de
  série sequencial, o método que nesta tarefa já exagerou uma diferença
  (falso +30 ms desmentido pela medição intercalada). Ou seja: 28 ms é o pior
  caso disponível, e o pior caso passa folgado no teto. Não há decisão que
  mudaria com um número novo.
- **Não implemente o plano B.** Trocar o `windowBackground` para cor depois do
  primeiro quadro (`setBackgroundDrawable` num `post`) acrescenta um caminho
  novo e um instante em que o fundo troca embaixo do conteúdo, para economizar
  algo abaixo do limiar de percepção. Não vale.
- **Não invente número.** Se não mediu neste ciclo, diga que não mediu.

**Faça o achado [medium]:** reescreva o comentário de `values/styles.xml` para
dizer o que o código faz hoje — que a linha vale para qualquer activity que use
`AppTheme` direto, e que a `MainActivity` não troca mais de tema —, para o
próximo leitor não reintroduzir o `setTheme` confiando no comentário. Esse é o
resto real deste ciclo.

A medição intercalada desta árvore contra `c27ed40` é minha, fora do laço, e
entra em `docs/specs/15-abertura-tti.md` depois do commit.
