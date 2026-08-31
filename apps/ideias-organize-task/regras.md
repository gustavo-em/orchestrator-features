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

Vermelho (`theme.colors.danger`) é exclusivo de ação destrutiva: hoje, só o botão Excluir.

Qualquer outro elemento que use vermelho é uma violação a corrigir, não um invariante a
preservar. Isso inclui estado de atraso, contadores, badges e o glifo de prioridade alta em
`TaskFacts.tsx`, que hoje usa `danger` e precisa de outro tratamento — peso, forma ou uma cor
de destaque não-alarmante do design system.

Esta regra manda *tirar* vermelho, nunca manda deixar como está. Se um achado apontar vermelho
fora do Excluir, o achado está certo.

## Linguagem

Nenhum texto atribui falha ao usuário. Sem "você não concluiu", sem "atrasado há N dias" como
manchete, sem tom de cobrança em estado vazio.
