Feature: atribuição de pessoas às tarefas de um projeto compartilhado.

Modelo de permissão, fechado pelo dono:

- O DONO do projeto pode atribuir e remover qualquer pessoa de qualquer tarefa.
- Qualquer MEMBRO pode se atribuir a uma tarefa e sair dela (só a si mesmo).
- Quem NÃO é dono nunca remove OUTRA pessoa da tarefa. Editor não ganha poder de
  atribuição sobre terceiros nesta fatia.
- Uma tarefa pode ter várias pessoas atribuídas; tarefa sem atribuição é normal.

Implementação:

- Dado: assignedIds (uids) por tarefa do projeto, sincronizado pelo caminho de
  conteúdo existente; a regra de segurança que garante o modelo acima (dono =
  livre; membro = só adicionar/remover o próprio uid) vai versionada em
  docs/firebase/firestore.rules — publicar é passo manual do dono, listado sem
  bloquear.
- UI: fichas/iniciais dos atribuídos na tarefa do projeto (MemberChip pequeno,
  padrão da pilha existente); ação de atribuir no detalhe/menu da tarefa —
  membro vê "Entrar na tarefa/Sair da tarefa"; dono vê a lista de membros com
  alternância por pessoa.
- A faixa do combinado e o placar individual não mudam nesta fatia; atribuição
  é organização, não pontos.
- Estados: tarefa cheia de atribuídos usa o padrão +N da pilha; sem atribuídos,
  nenhum espaço reservado.
- Validação no escopo de uma conta: dono se atribui/remove e atribui a segunda
  pessoa fake do documento; regras de terceiro viram teste unitário/regra
  versionada + observação.
- Regras fixas, a11y, tema, copy nos dois idiomas.
