Adicionar subtarefas DURANTE a criação de uma tarefa (hoje só é possível depois,
abrindo a tarefa criada).

Design, respeitando a captura em camadas já aprovada:

- A camada 0 (leigo) NÃO muda: continua mínima. Subtarefas entram na camada
  "Mais opções" (ou como entrada própria ao lado dela, se o design julgar mais
  claro): uma ação "Adicionar subtarefa" que revela um campo de linha única —
  digitar + confirmar adiciona à lista, repetível; cada subtarefa listada com
  remover.
- As subtarefas adicionadas aparecem como linhas simples (mesmo padrão visual
  indentado da feature de subtarefas existente — sem caixa aninhada) entre o
  campo e as ações, com contagem discreta quando a lista passa de 3.
- Salvar a tarefa cria a tarefa + suas subtarefas de uma vez (reusar o domínio
  de subtarefas existente; um evento consistente).
- Edição de tarefa existente: a mesma seção aparece já expandida com as
  subtarefas atuais (integrando com o fluxo de edição existente).
- Parser: NÃO inventar sintaxe nova de subtarefa nesta fatia.
- Teclado: adicionar várias subtarefas em sequência sem o teclado fechar a cada
  confirmação.
- Copy pt-BR/en-US; a11y (campo e remoções anunciáveis); regras fixas valem.
