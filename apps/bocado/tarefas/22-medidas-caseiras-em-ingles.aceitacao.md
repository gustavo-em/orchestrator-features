# Aceitação — 22 · Medidas caseiras em inglês

1. Com o app em English, a captura do diário mostra a medida caseira em inglês
   na linha da entrada: onde antes lia `1 colher de servir cheia · 45 g`, passa
   a ler o rótulo em inglês do glossário (`1 heaped serving spoon · 45 g` para
   `colher de servir cheia`). O nome do alimento continua traduzido e a linha
   continua com 64 dp.
2. A direção oposta está provada na mesma bateria: uma entrada registrada com o
   app em English aparece em português quando o idioma volta para Português.
   Basta uma entrada, capturada nos dois idiomas.
3. O bloco de macros da tarefa 19 não se moveu: as colunas de P, C e G/F
   continuam terminando no mesmo x das kcal, conferido na árvore.
4. O texto de compartilhar (`share/dayText.ts`) usa o mesmo rótulo da linha —
   provado por teste, não por captura.
5. A medida que a folha reabre (`foods.last_serving_label`) está no idioma
   corrente: abrir a folha de uma entrada já registrada, com o app em English,
   traz a medida em inglês selecionada.
6. Um rótulo que o glossário não cobre continua exibido como está guardado,
   sem tradução inventada e sem esconder a medida. Provado com um dos rótulos
   de origem do Open Food Facts (`nó`, `coió`, `folded`, `sadia`,
   `geladinho gulozitos`, `se a medida de 10g de bacon`).
7. Nenhuma migração de banco foi adicionada: `SCHEMA_VERSION` continua igual a
   `MIGRATIONS.length` e `diary_entries` não ganhou coluna. Se a decisão da
   tarefa criar tabela para o mapa de medidas, ela é de dado importado do seed,
   e o teste de migração prova que um banco na versão anterior chega à nova sem
   perder `diary_entries`.
8. Nenhuma entrada nova foi escrita à mão em `assets/data/foods.seed.json`: o
   que faltar nasce em `scripts/lib/glossary.mjs` e o seed é regerado.
9. `docs/DECISIONS.md` registra a escolha de traduzir na leitura, com o motivo,
   e onde o mapa de medidas passa a viver.
10. `npm run validate` verde.

## Contexto que o dono já apurou, 2026-09-10

Não repita esta investigação; ela está fechada.

- `measureLabelsEn` já existe no seed, com 230 entradas, gerada em
  `scripts/build-food-seed.mjs:1134-1140`. Cobre 5.772 das 5.780 ocorrências de
  medida do seed, ou 99,9 %. As 6 faltas são lixo de origem do Open Food Facts,
  não medidas de verdade.
- A folha de porção **já traduz**, via `mapSeedFood.ts:123` e
  `portion.ts:40-43`. Conferido no aparelho em English: `heaped serving spoon`,
  `heaped tablespoon`, `heaped medium ladle`. Não mexa nesse caminho.
- O que não traduz é `diary_entries.serving_label` (`schema.ts:62`), um `TEXT`
  sem locale, impresso cru em `DiaryEntryRow.tsx:131` e `:157` e em
  `share/dayText.ts:64,67`. `foods.last_serving_label` (`schema.ts:78`) tem a
  mesma forma.
- O casamento de rótulo já existe em `portion.ts:254`.

## Sobre o roteiro adb desta tarefa

O roteiro foi validado passo a passo contra o aparelho com o próprio
`AndroidTestDriver` antes de entrar na fila, e não com um ciclo de agente. Três
armadilhas descobertas nas tarefas 20 e 21 estão evitadas por construção;
mantenha-as evitadas se editar o arquivo:

- Um passo `optional` que não casa não falha ali — ele deixa o app na tela
  errada e derruba um passo posterior, com mensagem que aponta para o lugar
  errado. Todo passo do caminho principal é obrigatório.
- `tapText` só vê nós renderizados no dump do uiautomator. Um alvo abaixo da
  dobra não existe para ele, e a ordenação da busca muda quando o código muda.
  Buscas são específicas o suficiente para deixar o alvo na primeira tela.
- O desempate de `findNodeByText` dá +4 para valor igual e +3 para clicável,
  então um `tapText` cujo valor seja igual ao texto digitado num campo acerta o
  campo, não a lista. Nenhum alvo desta tarefa é igual ao termo buscado.
- Com `deviceState: "manter"` o aparelho chega do ciclo anterior como o ciclo
  anterior o deixou. O roteiro começa se orientando e termina restaurando o
  idioma em passo obrigatório.

## Tarefa encerrada sem execução, 2026-09-11

Não rode esta tarefa. O defeito que a motivou já estava corrigido quando o
brief foi escrito — os últimos ciclos da tarefa 21 resolveram exactamente o que
ela pede, e o dono só descobriu ao reler o código no dia seguinte.

`entryServingLabel` em `src/domain/diary/entryName.ts` recebe a entrada e o
locale, casa o `servingLabel` guardado contra as porções que o alimento tem
hoje — comparando com `label.pt` **e** com `label.en`, porque a entrada pode
ter sido escrita em qualquer um dos dois idiomas — e devolve o rótulo no idioma
corrente, caindo no texto guardado quando o glossário não cobre a medida.
`DiaryEntryRow` chama isso nas duas linhas que imprimem a porção. É a decisão
"traduzir na leitura" do brief, com o casamento reaproveitado, sem coluna nova
e sem migração.

O que o brief pedia e **não** foi verificado: o texto de compartilhar
(`share/dayText.ts`) e a medida que a folha reabre
(`foods.last_serving_label`). Se algum dos dois aparecer em português com o app
em inglês, a tarefa volta — mas só para esses dois pontos, não para a linha do
diário.
