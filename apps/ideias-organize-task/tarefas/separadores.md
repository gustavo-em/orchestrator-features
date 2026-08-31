Devolver o separador de seção e tirar o card que envolve cada seção na aba de tarefas.

O ciclo anterior trocou o filete horizontal do cabeçalho de seção por um espaçador invisível
(`SectionSpacer` em `views/SectionHeader.tsx`), com a justificativa de que um filete parecia
barra de progresso pela metade. Essa justificativa está descartada: o filete é régua
tipográfica, não indicador de progresso.

Sem o filete a seção perdeu contorno, e para compensar ganhou um card próprio
(`Section` em `screens/TodayScreen.tsx`, com `background-color`, `border` e `border-radius`).
Isso empilhou card dentro de card: o item de tarefa já é um card, então a tela ficou com duas
bordas concorrendo e menos ar.

As duas mudanças andam juntas. Restaure o filete no cabeçalho e remova fundo, borda e raio do
contêiner de seção, deixando só espaçamento. Não invente um terceiro tratamento.
