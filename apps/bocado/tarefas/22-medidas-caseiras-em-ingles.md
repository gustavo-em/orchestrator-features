Com o app em English, a medida caseira de uma entrada já registrada continua em
português. O nome do alimento traduz, a medida não, e as duas ficam na mesma
linha — `Rice, type 1, cooked` em cima e `1 colher de servir cheia · 45 g`
embaixo.

Origem em 2026-09-10: achado do dono na captura `today-english` da tarefa 21,
enquanto o roteiro de teste era validado no aparelho. O dono decidiu no mesmo
dia que isto não entra na tarefa 21 e vira tarefa própria.

Fatos verificados no código e no seed, todos em 2026-09-10:

- O seed já carrega o glossário de medidas. `assets/data/foods.seed.json` tem a
  chave de topo `measureLabelsEn`, com **230 entradas**, construída em
  `scripts/build-food-seed.mjs:1134-1140`. Ela cobre **99,9 % das ocorrências**
  de medida do seed (5.772 de 5.780). As 6 faltas são lixo de origem do Open
  Food Facts, não medidas: `sadia`, `geladinho gulozitos`,
  `se a medida de 10g de bacon`, `nó`, `coió` e `folded`.
- As porções do alimento **já traduzem**. `src/data/seed/mapSeedFood.ts:123`
  passa `seed.measureLabelsEn` para `seedServings`, que grava cada porção com
  rótulo `{ pt, en }`, e `servingLabel` em `src/domain/food/portion.ts:40-43`
  escolhe por locale com fallback para `pt`. Conferido no aparelho: com o app em
  English a folha de porção mostra `heaped serving spoon`, `heaped tablespoon` e
  `heaped medium ladle`.
- O que não traduz é a entrada do diário. `diary_entries.serving_label`
  (`src/data/db/schema.ts:62`) é um `TEXT` solto — um instantâneo do rótulo no
  idioma em que a entrada foi registrada, sem locale e sem par `{pt, en}`. Quem
  imprime esse texto cru: `src/components/DiaryEntryRow.tsx:131` e `:157`, e
  `src/domain/share/dayText.ts:64,67`.
- `foods.last_serving_label` (`schema.ts:78`) tem a mesma forma e o mesmo
  problema, porque é o que decide a medida que a folha reabre.
- Já existe a comparação que resolve a busca do par: `portion.ts:254` casa
  `servingLabel(candidate.serving, locale) === label`.

O que fazer:

1. Traduzir **na leitura**, não na escrita. A entrada continua guardando o
   rótulo como está hoje; quem renderiza resolve o idioma. Isto conserta as
   entradas antigas de graça e não pede migração de banco.
2. A ordem de resolução, para uma entrada com `foodId`: procurar entre as
   porções do alimento a que casa o `servingLabel` guardado — em qualquer um
   dos dois idiomas, porque a entrada pode ter sido escrita em English — e
   render o rótulo do locale atual. Reaproveite o casamento de `portion.ts:254`
   em vez de escrever outro.
3. Quando o alimento não tem a porção (entrada de alimento apagado, ou rótulo
   de embalagem que nunca esteve no glossário), o segundo caminho é o mapa
   `measureLabelsEn` do seed. Ele precisa estar disponível em tempo de leitura:
   decida entre guardá-lo numa tabela na importação do seed ou embarcá-lo como
   módulo, e **escreva o porquê** — é a decisão de arquitetura desta tarefa.
4. Sem tradução nos dois caminhos, mostre o rótulo guardado como está hoje. É o
   comportamento atual e é honesto; não invente tradução e não esconda a
   medida. Os 6 rótulos-lixo do OFF caem aqui de propósito.
5. Os três lugares que precisam ficar certos: a linha da entrada no diário
   ("Hoje" e `MealScreen`, que reusam `DiaryEntryRow`), o texto de compartilhar
   (`share/dayText.ts`) e a medida que a folha reabre
   (`foods.last_serving_label`).
6. Nada de tela nova, controle novo ou texto fixo novo. A linha da entrada
   continua com 64 dp de altura e o bloco de macros de 152 dp da tarefa 19 não
   se move; a medida caseira é a parte que já pode truncar, e continua sendo.
7. Verifique o caso oposto ao do achado: uma entrada registrada com o app em
   English tem de aparecer em português quando o idioma volta para Português.
   O achado original é só uma das duas direções.
8. Recusas fechadas, para não reabrir: coluna nova em `diary_entries` para o
   par de idiomas (migração que não paga o próprio custo, já que a leitura
   resolve); traduzir com serviço de rede; e inventar rótulo para o que o
   glossário não cobre.
9. `docs/DECISIONS.md` registra a escolha de traduzir na leitura e onde o mapa
   de medidas passa a viver. Se o glossário do seed precisar de entrada nova,
   ela nasce em `scripts/lib/glossary.mjs`, junto com as da tarefa 21, nunca
   escrita à mão no JSON gerado.
10. Testes: uma entrada com medida conhecida nos dois idiomas; uma entrada
    escrita em English lida em pt-BR; uma entrada cujo alimento não tem mais a
    porção, resolvida pelo mapa; e um rótulo fora do glossário, que continua
    como está. O texto de compartilhar entra na mesma bateria.
11. `npm run validate` verde.

Regras fixas valem. Ponto de atenção medido: a cobertura de 99,9 % é por
ocorrência no seed, não por entrada do diário do dono — o diário dele tem
poucas medidas distintas, então na prática a cobertura sentida é 100 % ou perto
disso. Não transforme isso em porcentagem na tela.
