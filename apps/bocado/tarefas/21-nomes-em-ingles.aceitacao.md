1. `docs/research/08-nomes-em-ingles.md` existe, com: número de termos
   distintos, cobertura alcançada (% de alimentos com nome inteiro
   traduzido), lista de pendentes por frequência e a decisão de seguir ou
   parar.
2. Se a tarefa parou na descoberta: nenhum código de UI, e o summary diz o
   motivo com o número medido. Os itens 3 a 6 não se aplicam.
3. Com Idioma = English em Metas, buscar "rice" traz o alimento da TACO com
   nome em inglês ("Rice, type 1, cooked" ou a forma decidida na regra de
   ordem), e a entrada registrada aparece em inglês em "Hoje" — captura e
   árvore.
4. Voltando a Português, os mesmos alimentos voltam ao nome original da TACO,
   sem reimportar o seed.
5. Alimento sem tradução completa mostra o nome em português inteiro, nunca
   uma mistura.
6. Testes de domínio: aplicação do glossário a nomes de exemplo (composição,
   acentos, termo desconhecido → sem `en`); `seed-import` lê `name_en`; a
   busca local em en-US encontra por termo em inglês.
7. Tamanho do seed no summary (aumento de no máximo 15 %) e tempo de
   importação medido.
8. `npm run validate` verde.

## Diagnóstico do dono, 2026-09-10 05:35

O gate `tela` falhou três ciclos com `tapText: "Metas" não encontrado na tela
atual`, e o árbitro do ciclo 2 já tinha acertado a leitura: não é defeito de
produto. O passo 7 do roteiro era `tapText "Metas"` não opcional, e o passo 11
do mesmo roteiro troca o idioma para English. O passo que voltava para
"Português" no fim era opcional. Quando o fluxo morria antes dele, o aparelho
ficava em inglês — e como `app.json` usa `deviceState: "manter"`, o ciclo
seguinte começava em inglês, onde o mesmo controle lê "Goals". Conferido no
aparelho às 05:30: a árvore trazia `Today`, `Goals`, `Add to Breakfast` e
`Share`. O primeiro ciclo passou desse ponto; todos os seguintes morriam no
passo 7.

Corrigido no roteiro `adb/21-nomes-em-ingles.json`, que agora é idempotente
quanto ao idioma:

- Prelúdio antes do `tapText "Metas"`: fecha uma folha aberta (`Fechar` e
  `Close`, ambos opcionais), e se o app estiver em inglês entra em `Goals`,
  rola até o fim, toca `Português` e volta. Todos opcionais, então em um
  aparelho já em português o prelúdio não faz nada.
- O `Goals` e o `Português` do fim deixaram de ser opcionais: restaurar o
  idioma agora é obrigatório, e é o que impede o vazamento para a próxima
  tarefa.
- Duas esperas de 500 ms saíram do prelúdio para o roteiro caber no limite de
  50 passos do `validateAdbSteps`.

Regra que vale para qualquer roteiro futuro que mexa em idioma, tema ou
qualquer estado persistido: com `deviceState: "manter"`, o passo que desfaz a
mudança tem de ser obrigatório, e o começo do roteiro tem de tolerar o estado
que um ciclo anterior interrompido deixou.

## Segundo diagnóstico do dono, 2026-09-10 06:20

O prelúdio de idioma resolveu o `tapText "Metas"`: a falha andou para o
`tapText "Goals"` obrigatório do fim, com o app parado na folha de busca em
inglês. A tarefa em si está funcionando — a árvore no aparelho traz
`Rice, type 1, cooked`, `Rice bran, crude`, `Rice noodles, cooked`,
`Rice flour, brown`, e a folha de porção mostra `Add · 58 kcal` com
`58 kcal · P 1.1 g · C 12.6 g · F 0.1 g`.

A causa é o desempate do `findNodeByText`. Ele dá +4 para valor igual ao
procurado e +3 para nó clicável. O passo era `tapText "Rice"` e o campo de
busca contém exatamente `rice`, então o campo somava 7 e a linha
`Rice, type 1, cooked`, só substring, somava 3: o toque ia para o campo de
texto. Nada navegava, os três passos opcionais seguintes erravam em cadeia e o
`Goals` obrigatório caía por estar na tela errada. O mesmo vale para qualquer
`tapText` cujo valor seja igual ao que foi digitado num campo da tela.

Corrigido: o alvo virou `Rice, type 1, cooked` (nome completo, que não é
substring de `rice`, então o campo deixa de casar), e os toques em
`Rice, type 1, cooked`, `Add ·` e `Done` deixaram de ser opcionais. A busca
continua sendo `rice`, de propósito: é ela que enche a captura
`search-english` de nomes em inglês, que é a evidência da tarefa.

Rótulos conferidos no aparelho em inglês: a folha de porção confirma com
`Add · 58 kcal`; depois dela o app volta para a folha de busca com uma barra
`1 item · 58 kcal` e um controle cujo `content-desc` é `Done` — é ele que
retorna para "Today", onde `Goals` existe.

## Terceiro diagnóstico do dono, 2026-09-10 07:00

Duas coisas: o roteiro finalmente está validado de ponta a ponta, e a captura
revelou um defeito de produto que os ciclos anteriores nunca chegaram a ver.

### O roteiro

O `tapText "Rice, type 1, cooked"` falhou porque o ciclo 5 mexeu no ranking
(`src/domain/food/rank.ts`, `BUNDLED_SOURCES`, usda 32 e off 10) e o alvo saiu
da área visível de uma busca por `rice`. O alvo dependia da ordenação que a
própria tarefa estava alterando.

Tentei refinar a busca em dois passos, com `Clear search` antes de digitar o
termo específico. Não funciona: o toque em `Clear search` não limpa o campo e o
texto novo é concatenado ao antigo — o campo ficou `"ricerice type 1"`. Não
investiguei se é o botão ou o foco; a saída foi não depender dele.

A busca virou `rice type 1`, uma só, digitada uma vez. Ela devolve exatamente
`Rice, type 1, cooked` e `Rice, type 1, raw`, as duas em inglês, e por ter
poucos casamentos é estável a mudanças de ranking. Três esperas de margem
depois de `hideKeyboard` e `scrollToEnd` saíram; o roteiro tem 47 passos.

Validei o arquivo inteiro contra o aparelho com o próprio `AndroidTestDriver`,
passo a passo, antes de retomar a fila: 47 passos, 3 capturas, 3 árvores,
nenhuma falha. Vale repetir esse dry-run sempre que um roteiro falhar duas
vezes — três ciclos de agente foram gastos no que uma execução direta mostra em
um minuto.

### Defeito na captura `today-english`

Com o app em English, o diário mostra `Today`, `Goals`, `Breakfast`,
`Ham and cheese hot or cold`, `Rice, type 1, cooked`, os macros como
`P / C / F` e `over the goal · 2,321 of 1,240 kcal` — tudo certo. Mas a linha
da porção continua em português: `1 colher de servir cheia · 45 g`.

Os nomes de alimento traduziram; as medidas caseiras não. Decidir se isso entra
nesta tarefa ou vira tarefa própria é do dono — não mudei nada por isso. Se
entrar, a medida aparece na linha da entrada, na folha de porção e no seletor
de medidas, e o `name_en` do glossário não cobre nenhuma das três.

### Nota sobre o aparelho

O dia 10 no aparelho tem três entradas repetidas de `Rice, type 1, cooked` de
58 kcal, sobra dos dry-runs. Com `deviceState: "manter"` elas ficam; não
afetam os gates, mas explicam a contagem se alguém comparar com uma captura
anterior.
