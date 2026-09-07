Feature: projeto editável de verdade + histórico de entrada de membros.

Decisões fechadas:

- Editar projeto: além de renomear, o modal/folha do projeto permite editar as
  propriedades que ele tem (cor, símbolo/ícone e o que mais existir no domínio),
  no mesmo padrão visual das folhas existentes. Só quem pode editar conteúdo
  (dono/editor) edita; viewer vê sem controles de edição.
- Histórico de entrada: ao abrir o modal do projeto compartilhado, exibir a
  lista de quem entrou e QUANDO (data/hora local), do mais recente ao mais
  antigo. Dado por membro: joinedAtMs registrado no momento do accept do
  convite.
- Migração: membros existentes sem joinedAtMs mostram "—" (sem inventar data);
  novos entrantes gravam o timestamp. Regra de segurança correspondente (campo
  novo permitido no isJoining) versionada em docs/firebase/firestore.rules como
  artefato — passo manual do dono para publicar, sem bloquear.
- O histórico não é feed: sem eventos de saída/edição nesta fatia — só entrada
  de membros, que é o que o dono pediu.
- Projeto não compartilhado: modal de edição igual, sem seção de histórico.
- Regras fixas e gabaritos de geometria da ShareSheet continuam valendo onde se
  aplicarem; copy nos dois idiomas.
