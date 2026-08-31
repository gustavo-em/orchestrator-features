Decisões de design já fechadas para o Ideias. Valem em toda tarefa.

## Separadores de seção

Cabeçalho de seção usa rótulo curto em maiúsculas, contagem ao lado e um filete fino
horizontal que atravessa o resto da largura. O filete fica, e é ele que agrupa a seção.

Não trocar o filete por espaçador invisível. Não é barra de progresso: é régua tipográfica,
o mesmo recurso de sumário editorial e de cabeçalho de tabela. Se o filete parecer pesado,
baixe a opacidade ou a espessura — não remova.

## Nada de card dentro de card

Item de tarefa já é um card com fundo e borda. A seção que contém esses itens não pode ter
fundo, borda ou raio próprios. Seção se delimita por cabeçalho, filete e espaço em branco.

Quando bater a vontade de "agrupar melhor", a resposta é espaçamento, não outra caixa.

## Cor

`theme.colors.danger` é exclusivo de ação destrutiva. Hoje isso significa **um único lugar**:
o botão Excluir, em `ConfirmDialog.tsx`.

Em `TaskFacts.tsx` existem dois usos de `danger`, e **os dois são violações a corrigir**:

- `priorityColor`, vindo de `toneOf[facts.priority.tone]` — pinta o glifo `≡` de vermelho em
  tarefa de prioridade alta.
- `dueColor`, quando `facts.due?.late` — pinta a data de vermelho em tarefa atrasada.

Nenhum dos dois é ação destrutiva. Prioridade alta não é perigo e atraso não é perigo; os dois
precisam de outro tratamento — peso tipográfico, forma do glifo, ou uma cor de destaque
não-alarmante do design system. O mesmo vale para o uso equivalente em `ListsScreen.tsx`.

Esta regra manda **tirar** vermelho, nunca manda preservar. Não escreva em
`implementationConstraints` nem em `outOfScope` nada que mantenha esses usos como estão, e não
justifique preservá-los alegando semântica diferente: a semântica é justamente o problema.
Se um achado apontar vermelho fora do Excluir, o achado está certo.

## Linguagem

Nenhum texto atribui falha ao usuário. Sem "você não concluiu", sem "atrasado há N dias" como
manchete, sem tom de cobrança em estado vazio.
