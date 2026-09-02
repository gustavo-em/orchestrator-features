1. Tarefa com prazo: ligar o aviso e escolher antecedência em dias; evidência
   do controle na edição.
2. As opções de dias nunca ultrapassam o intervalo até o prazo (prazo em 2
   dias não oferece "3 dias antes"); tarefa sem prazo não mostra o controle.
3. Agendamento local criado via notifee com trigger de timestamp (evidência de
   código/teste; disparo real pode ser evidenciado com trigger curto de teste
   ou inspeção dos agendamentos pendentes).
4. Editar o prazo reagenda; concluir ou excluir a tarefa cancela o aviso
   (evidência via agendamentos pendentes antes/depois).
5. Permissão de notificação pedida só ao ligar o primeiro aviso; negada →
   estado claro na UI, sem crash.
6. Copy pt-BR/en-US com paridade ("Vence amanhã" / "Vence em N dias").
7. Tema claro/escuro, a11y (controle anunciável, alvo ≥ 48dp), regras fixas
   respeitadas; captura rápida da camada 0 intocada.
8. `npm run validate` verde com testes novos do domínio de agendamento.
