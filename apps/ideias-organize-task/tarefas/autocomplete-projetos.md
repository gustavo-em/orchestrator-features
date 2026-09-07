Templates de criação na tela de novo projeto/espaço (usar o NOME NOVO decidido
no rebrand). O dono forneceu um mockup aprovado — reproduza esta especificação
fielmente:

Tela "Novo [nome novo]" com subtítulo "Comece de um destes ou do zero." e uma
grade 2 colunas de cards de template, cada um com ícone em pastilha colorida,
título, descrição curta e (interno) o par ícone·cor pré-definido:

| Template | Descrição | Ícone · cor |
|---|---|---|
| Casa | Consertos e combinados | home · coral |
| Viagem | Reservas, malas, roteiro | plane · ocean |
| Contas | O que vence e quando | wallet · sun |
| Mercado | A lista da semana | cart · mint |
| Trabalho | Entregas e responsáveis | briefcase · ocean |
| Em branco | Só o nome | + · sun (card tracejado) |

Comportamento:

- Tocar num template pré-seleciona nome, ícone e cor na folha de criação (o
  usuário pode editar tudo antes de salvar); "Em branco" vai direto para a
  folha vazia como hoje.
- O primeiro card aparece com borda de seleção (como no mockup, "Casa"
  destacado) apenas como estado de foco/seleção ao navegar — nenhum template é
  criado sem toque explícito.
- O seletor "compartilhado" da criação (feature já entregue) continua presente
  e funciona com qualquer template.
- Ícones do set existente do app (FieldGlyphs/design system); cores mapeadas
  para tokens do tema (coral/ocean/sun/mint — se algum não existir como token,
  criar tokens semânticos de categoria no tema, claro e escuro).
- Cards seguem as regras fixas (card simples, sem card dentro de card; o
  tracejado do "Em branco" é borda, não caixa aninhada).
- Copy pt-BR/en-US com paridade.
