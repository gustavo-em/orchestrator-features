1. Camada A demonstrada em tela: sync detecta conclusão de tarefa por outro
   membro → notificação local aparece na bandeja (screenshot); idem para membro
   novo entrando; nada notifica os atos do próprio usuário.
2. Dedupe: sincronizar duas vezes o mesmo estado não repete notificação.
2b. Camada A+: tarefa de background registrada e executando o pull+detecção com
   o app fechado (evidência: log/registro da execução agendada + notificação
   chegando com o app fora do foreground); limitações do SO documentadas.
3. Permissão de notificação pedida no momento certo (não na abertura fria do
   app; no primeiro contexto de projeto compartilhado ou em Ajustes).
4. Toggle "Notificações do projeto" em Ajustes, ligado por padrão, respeitado.
5. Camada B presente no código: token FCM registrado em users/{uid}/fcmTokens
   (regra versionada), function em functions/ com README de deploy; passo
   manual do dono listado no summary; app 100% funcional sem o deploy.
6. Copy pt-BR/en-US; identidade por nome/@handle; `npm run validate` verde.
