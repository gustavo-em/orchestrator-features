Perfil editável com nome único: a identidade visível de cada pessoa deixa de ser o
email e passa a ser um nome de usuário único.

Decisões fechadas:

- Tela de perfil editável: nome de exibição e nome de usuário único (handle).
  Email nunca mais aparece como identidade em tela nenhuma (membros de projeto,
  faixa do combinado, sheets) — procure e substitua todos os pontos.
- Unicidade do handle via Firestore: coleção `usernames/{handle}` reservando o
  handle para um uid (transação: criar a reserva nova e apagar a antiga na mesma
  operação; regra de segurança correspondente versionada em
  docs/firebase/firestore.rules como artefato a publicar pelo dono).
- Handle: minúsculas, 3-20 chars, letras/números/underscore; validação no cliente
  com mensagem clara; erro de "já em uso" tratado sem culpar o usuário.
- Membros de projetos compartilhados existentes migram a exibição: onde hoje
  aparece email/nome derivado, passa a mostrar o nome de exibição + @handle.
- Login anônimo (se já implementado pela tarefa anterior) usa o mesmo sistema: o
  nome pedido vira nome de exibição, handle sugerido automaticamente e editável.
