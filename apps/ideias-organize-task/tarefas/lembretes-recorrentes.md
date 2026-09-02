Feature: lembrete — um item que não é tarefa, e sim algo para ser lembrado de
tempos em tempos (aniversário de alguém, aniversário de casamento, pagar algo
todo mês).

Decisões fechadas:

- Na criação/edição, a pessoa escolhe o TIPO do item: tarefa (como hoje) ou
  lembrete. Lembrete não entra no fluxo de concluir/pontos/trio/combinado —
  ele não é trabalho, é memória; não conta em "abertas", não vence, não pesa
  no progresso.
- Lembrete tem: título, data-base e recorrência. Recorrências mínimas desta
  fase: uma vez só, toda semana, todo mês, todo ano (aniversários = todo ano).
  Decidir a UI mais simples possível (regras.md: simplicidade acima de tudo).
- Notificação local via `@notifee/react-native` com trigger repetitivo ou
  reagendamento no disparo/boot — decidir a técnica mais confiável sem
  backend e registrar. Mesmo canal/permissão da feature de aviso de prazo.
- Lembrete pode morar dentro de um espaço (inclusive compartilhado — sincroniza
  pelo mesmo caminho de conteúdo do espaço; quem edita conteúdo edita
  lembretes) ou fora de espaço, como uma tarefa normal.
- Na lista, o lembrete se distingue visualmente da tarefa de forma discreta
  (glifo próprio, ex.: sininho; sem checkbox de conclusão) — dentro das regras
  fixas, sem card dentro de card.
- Excluir/editar lembrete atualiza/cancela os agendamentos; próximo disparo
  visível na edição ("Próximo aviso: 12 de março").
- Copy pt-BR/en-US com paridade; a11y completa; tema claro/escuro.
- Persistência local no padrão do domínio; nos espaços compartilhados o
  documento carrega o lembrete sem quebrar clientes antigos (campo novo
  tolerado pelas regras já publicadas do Firestore — se precisar de mudança de
  regra, gerar o arquivo em docs/firebase/firestore.rules e listar o passo
  manual do dono, nunca bloquear).
