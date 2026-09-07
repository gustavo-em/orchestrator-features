1. `/Users/gustavorosa/Desktop/builds-para-as-lojas/Lesingo-<versionName>-<versionCode>.aab`
   existe, tem mais de 10 MB e foi gerado nesta execução.
2. O `.env` do projeto tem `VERSION_CODE` >= 19 e `VERSION_NAME` correspondente, e o
   número é estritamente maior que o anterior.
3. O AAB está assinado com a chave de upload (`saylens-upload`), não com a chave de
   debug — com a evidência do certificado citada no summary, ou a explicação de por
   que a ferramenta de verificação não existe na máquina.
4. `scripts/clean-build-caches.sh` existe, é executável, tem `--android`, `--ios`,
   `--all` e `--dry-run`, e não toca em `node_modules`, `.env`, keystore nem
   `iOS DeviceSupport`.
5. `/Users/gustavorosa/Desktop/builds-para-as-lojas/LEIA-ME.txt` descreve o build do
   Lesingo em português, com versão, chave e o passo manual restante.
6. O repositório está commitado, com mensagem em inglês no padrão do projeto, e
   `git status --porcelain` volta vazio.
7. Nenhum arquivo de código de produto foi alterado sem necessidade de build.
