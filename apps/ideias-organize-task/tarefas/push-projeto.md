Notificações de atividade do projeto compartilhado. Dois gatilhos pedidos pelo
dono:

1. Alguém do projeto CONCLUIU uma tarefa → os demais membros recebem notificação
   ("Fulano concluiu 'X' em Projeto Y").
2. Alguém ENTROU no projeto → os demais recebem ("@fulano entrou em Projeto Y").

Arquitetura em DUAS camadas (dono é solo, Firebase-only — implementar as duas):

- Camada A — notificação local por sincronização (funciona JÁ, sem backend):
  quando o app sincroniza (pull existente, abertura, retorno ao foreground) e
  detecta conclusão nova de OUTRO membro ou membro novo desde o último pull,
  dispara notificação local (Notifee ou API local do messaging). Deduplicar por
  evento (nunca notificar duas vezes o mesmo fato, nem fatos do próprio
  usuário). Esta camada é a entrega verificável desta tarefa.
- Camada A+ — checagem em background (só libs, sem backend): background fetch
  (react-native-background-fetch ou headless task equivalente) acordando o app
  a cada ~15 min para rodar o mesmo pull+detecção da Camada A com o app
  FECHADO. Aceitar as limitações do SO (intervalo mínimo, throttling por
  bateria) e documentá-las no summary; mesma dedupe e mesmo toggle. Com isso o
  usuário recebe a notificação em minutos sem nenhum servidor.
- Camada B — push real via FCM (preparada, ativação manual do dono): cliente
  com @react-native-firebase/messaging — permissão de notificação (Android 13+),
  token registrado em users/{uid}/fcmTokens, handler de mensagem em
  foreground/background. Uma Cloud Function mínima (onDocumentWritten em
  sharedLists) versionada em functions/ no repo, com README: deploy exige plano
  Blaze e `firebase deploy --only functions` — PASSO MANUAL do dono, listado no
  summary, nunca bloqueante. Enquanto não deployado, a camada A cobre.
- Regras de segurança para fcmTokens (só o próprio uid escreve/lê os seus)
  versionadas em docs/firebase/firestore.rules — republicação é passo manual.
- Preferência do usuário: um toggle simples em Ajustes ("Notificações do
  projeto") ligado por padrão; respeitá-lo nas duas camadas.
- Copy das notificações nos dois idiomas, tom das regras (nunca cobrança);
  identidade = nome/@handle, nunca e-mail.
- Validação no escopo de uma conta + device: notificação local disparando ao
  detectar mudança feita "por outro" (simulável editando o documento pela conta
  descartável/fixture); FCM real vira observação com o passo manual listado.
