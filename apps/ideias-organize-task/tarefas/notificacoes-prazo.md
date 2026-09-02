Feature: notificação de prazo se aproximando, configurada na própria tarefa.

Decisões fechadas:

- Ao criar/editar uma tarefa COM prazo, a pessoa pode ligar "avisar antes do
  prazo" e escolher a antecedência em DIAS (nunca horas/minutos nesta fase).
- As opções de antecedência são limitadas ao intervalo real: só valem
  quantidades de dias que caibam entre hoje e o prazo (prazo em 3 dias →
  oferecer 1, 2 e 3 dias antes; nunca oferecer 5). Tarefa sem prazo não mostra
  o controle.
- A notificação é LOCAL, agendada com a lib já instalada
  (`@notifee/react-native`, trigger por timestamp) — nenhum backend novo,
  nenhuma Cloud Function. Reaproveitar o canal/permissão do fluxo de push
  existente; pedir permissão só quando a pessoa ligar o aviso pela primeira
  vez.
- Horário do disparo: um horário fixo digno de manhã (ex.: 09:00 local) no dia
  escolhido — decidir e registrar; nunca meia-noite.
- Mudou o prazo, mudou a antecedência ou concluiu/excluiu a tarefa → o
  agendamento é atualizado/cancelado junto. Tarefa concluída nunca notifica.
- O aviso abre o app na tarefa (deep link interno básico: ao tocar, abrir o
  app; se for simples, focar a tarefa — não travar a feature por navegação
  perfeita).
- Copy pt-BR/en-US com paridade; conteúdo da notificação diz o título da
  tarefa e quanto falta ("Vence amanhã", "Vence em 3 dias").
- UI dentro das regras fixas do app (regras.md): controle discreto na edição
  da tarefa, sem poluir a captura rápida na camada 0; a11y completa.
- Persistência local no mesmo padrão do domínio (o agendamento sobrevive a
  reiniciar o app; re-sincronizar agendamentos no boot se necessário).
