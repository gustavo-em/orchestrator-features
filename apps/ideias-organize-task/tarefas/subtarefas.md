Feature grande: subtarefas dentro de tarefas.

Decisões fechadas:

- Um nível só de aninhamento (tarefa → subtarefas); sem sub-subtarefas.
- Criar/editar/concluir/excluir subtarefa a partir da tarefa (detalhe/edição);
  a folha de captura simplificada NÃO ganha campo de subtarefa na camada 0 —
  subtarefas vivem no contexto da tarefa.
- A tarefa mostra o progresso das subtarefas de forma discreta (ex.: 2/5) no
  card, sem poluir a lista; concluir todas as subtarefas NÃO conclui a tarefa
  sozinho (decisão explícita: o dono conclui), mas o app pode sugerir.
- Concluir a tarefa-mãe pergunta ou conclui as subtarefas abertas de forma
  consistente — decidir no design e registrar.
- Subtarefas participam do domínio existente (eventos, persistência local) no
  mesmo padrão das tarefas; em tarefas de projeto compartilhado, subtarefas
  sincronizam pelo mesmo caminho do conteúdo (quem pode editar conteúdo pode
  mexer nas subtarefas).
- Pontos/progresso individuais: subtarefa não vale pontos própria (o placar é
  da tarefa), para não inflar o sistema de progresso.
- UI dentro das regras fixas: sem card dentro de card — subtarefas como linhas
  indentadas com filete/checkbox, não caixas aninhadas.
- Acessibilidade completa nos novos controles; copy nos dois idiomas.
