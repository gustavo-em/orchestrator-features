1. Com o aplicativo recém-instalado, "Hoje" mostra os sete chips da semana
   corrente já na abertura, com o dia de hoje selecionado e marcado, **sem
   nenhuma interação antes da captura**. Tocar num dia anterior e voltar segue
   funcionando.
2. Uma entrada registrada mostra três linhas: nome, porção com gramas, e os
   macros `P x g · C y g · G z g` com uma casa decimal e numerais tabulares.
   Vale em "Hoje" e na tela da refeição. O rótulo de acessibilidade da entrada
   inclui os três macros depois das calorias.
3. Tocar numa entrada abre a folha em modo edição com a ação "Remover" visível;
   usá-la apaga a entrada e mostra "<alimento> removido · Desfazer", e o
   "Desfazer" traz a entrada de volta com a mesma porção. O deslizar para a
   esquerda continua removendo.
4. Buscar "leite" e abrir a folha de um leite: a unidade base é **ml**, a
   referência aparece como "100 ml", e a linha de macros acompanha a quantidade.
   Um alimento sólido continua em g.
5. Abrir a folha de um alimento nunca registrado (ex.: "Arroz, tipo 1, cozido"
   num aparelho limpo): o **primeiro** chip da fila é "g", ele já vem
   selecionado e a quantidade abre em 100. As medidas caseiras aparecem à
   direita dele.
6. Registrar esse alimento com uma medida caseira e reabrir a folha: ela volta
   na medida e na quantidade usadas por último, provando que a memória vence o
   padrão.
7. `npm run validate` verde, com testes de unidade para: a ordem das unidades
   com gramas primeiro, o padrão de 100 g sem histórico, a memória vencendo o
   padrão, e o mapeamento de `isLiquid` para ml.

Nota de evidência (device): esta tarefa roda com o aparelho limpo, e desde a
tarefa 06 um aparelho limpo abre no **primeiro uso**, não em "Hoje". Os passos
base atravessam "Perder peso" → "Calcular" → "Começar" antes de qualquer
verificação. Um FAIL de "não encontrou a tela esperada" logo na abertura é
coleta desatualizada, não defeito do aplicativo.

