Cinco ajustes pedidos pelo dono depois de usar o aplicativo no aparelho. As
decisões estão fechadas em `docs/specs/09-ajustes-do-dono.md`; leia essa
especificação na fase de planejamento, ela explica cada uma e diz onde substitui
decisão anterior.

1. REGRESSÃO — a faixa de dias sumiu da tela "Hoje": entre o cabeçalho e o
   número do dia há um vão vazio da altura dela. A lista monta 104 semanas e
   pede `initialScrollIndex` no índice 103, de páginas cuja largura ela ainda
   não mediu. Faça a semana atual ser o primeiro item renderizado, sem depender
   de `initialScrollIndex`, com a página declarando a própria largura; inverta a
   ordem da lista se for preciso, preservando o gesto atual.
2. Cada entrada do diário passa a mostrar uma terceira linha com
   `P 1,9 g · C 21 g · G 0,2 g`, em `label`/`inkMuted` com `tabular-nums`, em
   "Hoje" e na tela da refeição, e os três macros entram no rótulo de
   acessibilidade depois das calorias.
3. Remover deixa de depender do gesto escondido: a folha de porção em modo
   edição ganha a ação visível "Remover" em `danger`, alvo ≥ 48 dp, que apaga a
   entrada e mostra o snackbar de desfazer já existente. O deslizar continua
   como atalho.
4. Líquido usa mililitro: `isLiquid` passa a ser preenchido no seed (categorias
   de bebidas, leites e sucos) e no mapeador do Open Food Facts
   (`serving_quantity_unit === 'ml'`); para esses alimentos a unidade base da
   folha é ml e a referência é "100 ml", com a conversão 1 ml = 1 g comentada no
   código junto do motivo.
5. Gramas primeiro: o chip "g" (ou "ml") passa a ser o PRIMEIRO da fila, fixo à
   esquerda, com as medidas caseiras roláveis depois dele; sem histórico, a
   folha abre em 100 g e o "+" de um toque registra 100 g. A última porção usada
   naquele alimento continua vencendo o padrão.

Regras fixas valem. Nenhuma mudança de cor, tipografia ou motion.
