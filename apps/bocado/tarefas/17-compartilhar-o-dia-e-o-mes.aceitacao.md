1. Existe um caminho visível para compartilhar o dia, e "Hoje" não ficou mais
   cheia por causa dele — a captura de "Hoje" antes e depois mostra isso.
2. Compartilhar o dia abre o seletor do Android com um PNG anexado. A captura
   mostra o seletor aberto com a miniatura.
3. O PNG do dia traz data, kcal do dia, os três macros e as entradas por
   refeição, com a marca, e **sem** barra de status ou barra de navegação
   dentro da imagem. O arquivo é aberto e conferido, não só relatado.
4. O texto resumido do dia é gerado e cabe numa mensagem de WhatsApp sem
   quebrar: o texto vai inteiro no summary.
5. O PNG do mês mostra um quadrado por dia com o resumo que a pesquisa
   aprovou, e a pesquisa diz o que foi cortado e por quê.
6. Um dia sem nenhum registro gera peça e texto que dizem isso, em vez de
   quebrar ou sair vazio.
7. Nada sai do aparelho sem o usuário escolher o destino: nenhuma chamada de
   rede é feita pela feature. Provado no diff.
8. O tempo para gerar o PNG do dia e o do mês no J6 vai medido no summary.
9. `npm run validate` verde, com teste do texto resumido — inclusive dia vazio
   e dia com acentos e nomes longos.

## As linhas somem da árvore: era o estado, não a caixa

**Correção do que eu havia escrito aqui.** Levantei a hipótese de que o corpo
da folha media uma caixa curta e o Android podava o que transbordava — o
mecanismo da tarefa 03. Estava errado, e a investigação do ciclo 3 mostrou a
causa real: as três `ActionRow` ficavam **`disabled`** até o SQLite responder e
enquanto `isShareAvailable()` estava pendente, e uma linha desabilitada sai do
alcance de quem usa leitor de tela e do driver, mesmo continuando pintada.

O que eu disse que não era problema continua não sendo: `ActionRow` já tinha
`accessible`, `accessibilityRole="button"`, `accessibilityLabel`,
`accessibilityState` e `testID`, e o `no-hide-descendants` existe só na caixa
de 1×2 dp das peças fora de vista, que é irmã da folha e não a contém.

Fica a lição, que vale para a próxima: **"desenhado mas fora da árvore" tem
mais de uma causa.** Na tarefa 03 era transbordo de caixa; aqui era estado
desabilitado. O sintoma não distingue as duas — a árvore e o estado do
componente distinguem.

**Prova que fecha:** a árvore da folha aberta traz `share-day-image`,
`share-day-text` e `share-month-image`, cada uma habilitada e com altura
≥ 48 dp. Sem isso, ninguém com leitor de tela alcança a feature e o driver não
consegue tocá-la — que é por que os três critérios de compartilhamento seguem
sem evidência.

## Se o seletor não aparecer na captura, é tempo, não defeito

Rasterizar 1080 × 1350 no J6 e o seletor do Android animar levam mais do que a
espera original de 2,5 s. Os passos base já foram ajustados para esperar 6 s
depois de cada uma das três linhas.

Se ainda assim a captura não pegar o seletor, **não trate como defeito do
aplicativo sem antes distinguir as duas coisas**:

- o `ShareModule` foi chamado e o `createChooser` disparou, mas a captura veio
  cedo demais — verifique a árvore, que traz `android:id/chooser` ou o
  `resolver_list` quando o seletor está de pé;
- ou nada disparou, e aí o `content-desc` da linha e o estado dela dizem.

Se a segunda hipótese não se sustentar na árvore, feche a tarefa com o que
está provado e liste o seletor como não verificado. O dono grava o caminho em
vídeo, como fez na tarefa 16.

Faça o achado [low] do Snackbar: erro efêmero tem um jeito só de ser dito neste
aplicativo, e é o Snackbar que já existe.

### Ciclo 5: a reentrância se resolve no handler, não no `disabled`

A linha que está gerando continua tocável. Corrija **sem** voltar a pôr
`disabled` nela: foi justamente o `disabled` que tirou as três linhas da árvore
de acessibilidade nos ciclos 2 e 3, e reintroduzi-lo desfaz aquela correção e
reabre o defeito.

O jeito certo é o que a tarefa 16 já usou e que está no repositório: uma
**guarda no handler** — se já há uma geração em curso, o toque não faz nada.
A linha continua `enabled` na árvore, com `accessibilityState={{ busy: true }}`
dizendo o que está acontecendo, e um segundo toque simplesmente não inicia
nada.

Critério: com uma geração em curso, as três linhas continuam presentes e
`enabled` na árvore, e dois toques seguidos na mesma linha produzem **uma**
geração. Se o ciclo não conseguir provar isso em tela, prove por teste e diga
que a prova é de teste.
