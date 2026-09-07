1. `/Users/gustavorosa/Desktop/builds-para-as-lojas/Aluza-<versionName>-<versionCode>.aab`
   existe, tem mais de 10 MB e foi gerado nesta execução.
2. O `.env` tem `VERSIONCODE` >= 19 e `VERSIONNAME` correspondente, estritamente maior
   que o anterior.
3. O AAB está assinado com a chave `aluza-release`, não com a de debug — com evidência
   do certificado no summary, ou a explicação de por que a ferramenta não existe.
4. A configuração de App Check continua presente no fonte e no `google-services.json`
   embarcado, com a verificação citada no summary.
5. `scripts/clean-build-caches.sh` existe, é executável, tem `--android`, `--ios`,
   `--all` e `--dry-run`, e não toca em `node_modules`, `.env`, keystore,
   `google-services.json`, `GoogleService-Info.plist` nem `iOS DeviceSupport`.
6. `LEIA-ME.txt` no Desktop tem a seção do Aluza e preserva a do Lesingo.
7. Commit em inglês no padrão do repositório e `git status --porcelain` vazio.
