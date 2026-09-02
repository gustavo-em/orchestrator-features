1. Criar item como lembrete (título + data + recorrência semanal/mensal/anual/
   uma vez); evidência da UI de criação e da edição.
2. Lembrete não tem checkbox de conclusão, não conta nas abertas, não gera
   pontos nem entra no trio/combinado; evidência comparando com uma tarefa.
3. Agendamento local criado (trigger repetitivo ou reagendamento) e visível em
   "próximo aviso" na edição; editar/excluir atualiza/cancela (evidência via
   agendamentos pendentes).
4. Lembrete dentro de espaço e fora de espaço; em espaço compartilhado,
   persiste no documento e volta após pull sem quebrar o cliente.
5. Distinção visual discreta (glifo próprio), regras fixas respeitadas, tema
   claro/escuro, a11y (tipo anunciado corretamente).
6. Copy pt-BR/en-US com paridade.
7. Aniversário anual configurado dispara no ano seguinte (evidência lógica/
   teste de domínio, não espera real).
8. `npm run validate` verde com testes novos do domínio de lembretes.
