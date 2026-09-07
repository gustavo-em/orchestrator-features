Verificação completa do app — tarefa de validação, não de feature nova: garantir que
tudo que existe funciona de ponta a ponta, com prioridade para projetos
compartilhados e login.

Roteiro mínimo que a evidência precisa cobrir (o tester conduz via requestedSteps,
uma conta, criando descartáveis quando precisar):

1. Login: email/senha, erro de credencial, recuperação, sessão persistida,
   logout; social e anônimo se já implementados pelas tarefas anteriores.
2. Tarefas: criar, concluir, aba today, separadores — sem regressão visual das
   regras fixas.
3. Projetos compartilhados: criar projeto, gerar convite, convite inválido,
   estados vazio/erro/offline da ShareSheet conforme os gabaritos 6d-6f.
4. Faixa "Hoje, no combinado": estados alcançáveis com uma conta conforme 6a-6c.
5. Perfil e handle, se já implementados.

Se algo estiver quebrado: os achados viram feedback e o lead corrige — é para isso
que esta tarefa roda com os gates completos. Se tudo passar, a entrega é o PASS
com a evidência arquivada; nenhuma mudança de código é esperada nesse caso.
Estados que exigem segunda conta continuam observação, nunca FAIL.
