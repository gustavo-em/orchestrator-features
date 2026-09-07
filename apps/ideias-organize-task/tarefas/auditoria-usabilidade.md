Auditoria completa de usabilidade do aplicativo, do ponto de vista de um usuário
real — e a entrega é um DOCUMENTO, não mudanças de código.

Método:

- Percorra o app inteiro como um usuário novo e depois como um usuário de todo
  dia: primeira abertura, login, criar tarefas, concluir, projetos
  compartilhados, faixa do combinado, perfil, foco. O tester coleta a evidência
  de cada fluxo (screenshots + árvores) via requestedSteps.
- Para cada fricção encontrada, registre: onde (tela/fluxo), o que o usuário
  esperava, o que aconteceu, gravidade (impede / atrapalha / poderia ser melhor)
  e a menor correção proposta.
- Se apoie nas heurísticas clássicas (visibilidade de estado, prevenção de erro,
  reconhecimento em vez de memorização, consistência) e nas regras fixas do app;
  use a skill de UX mobile como roteiro.
- Não mude código nesta tarefa, com uma exceção: escrever o relatório.

Entregável: `docs/product/auditoria-usabilidade.md` no repositório, com os
achados priorizados (tabela por gravidade), cada um ancorado no screenshot/árvore
que o evidencia, e uma lista final "top 5 para atacar primeiro". Esse arquivo é o
que os critérios validam.
