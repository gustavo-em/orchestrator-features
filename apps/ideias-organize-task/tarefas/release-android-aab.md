chore(release): build the signed Play Store bundle with the App Check update

Objetivo final: um `.aab` assinado com a chave de release do Aluza, carregando a
atualização de segurança (App Check e o que veio junto), pronto para o dono subir na
Play Console de manhã, entregue em
`/Users/gustavorosa/Desktop/builds-para-as-lojas/`.

Esta é uma tarefa de **release engineering**. Não há mudança de UI, não há tela para
olhar, não há device para validar. Nenhum agente de produto, UX ou visual precisa
opinar. O que vale é: o artefato existe, está assinado com a chave certa, tem uma
versão que a Play Console aceita e não perdeu a configuração de App Check.

## 1. Higiene de cache antes de construir

A máquina tem pouco espaço livre e o dono alterna entre este app e o Lesingo, em
Android e iOS, no mesmo disco. Antes do build:

- Confira o espaço com `df -h /System/Volumes/Data`.
- Crie (ou atualize, se já existir) `scripts/clean-build-caches.sh` neste repositório:
  bash com `set -euo pipefail`, comentado em inglês, aceitando `--android`, `--ios`,
  `--all` e `--dry-run`, imprimindo quanto cada alvo ocupa antes de apagar e o espaço
  livre no fim.
  - Alvos Android: `android/build`, `android/app/build`, `android/.gradle`,
    `~/.gradle/caches/build-cache-*`, `~/.gradle/caches/transforms-*`.
  - Alvos iOS: `ios/build`, `~/Library/Developer/Xcode/DerivedData`,
    `~/Library/Caches/CocoaPods`, e `~/Library/Developer/Xcode/Archives` mais antigos
    que 30 dias. `ios/Pods` só quando o modo for explicitamente pedido.
  - O script **nunca** apaga `node_modules`, `.env`, keystore, `google-services.json`,
    `GoogleService-Info.plist`, nem `~/Library/Developer/Xcode/iOS DeviceSupport`.
  - `chmod +x` no script.
- Rode o script no modo que libere espaço sem sabotar este build, e explique a escolha
  no summary.

## 2. Versão

O `.env` (gitignored) está em `VERSIONCODE=18` / `VERSIONNAME=1.8`.

- Escreva `VERSIONCODE=19` e `VERSIONNAME=1.9`.
- Regra acima de qualquer outra: **o versionCode só sobe**. Se houver evidência no
  repositório de um código maior já publicado, use `maior + 1` e diga isso no summary.
- `.env.example` continua com os números de exemplo.

## 3. Build

- Gere o bundle com `npm run android:bundle` (`cd android && ./gradlew bundleRelease`).
- A chave de release **já está configurada**: `ANDROID_RELEASE_STORE_FILE=aluza-release.keystore`
  resolve para `android/app/aluza-release.keystore`, que existe, com alias e senhas no
  `.env`. Não peça credencial ao dono.
- Antes de gastar minutos de build, confira rapidamente que
  `android/app/aluza-release.keystore` existe e que as quatro variáveis
  `ANDROID_RELEASE_*` estão preenchidas no `.env`. Se faltar alguma, o Gradle cai
  silenciosamente para a chave de debug — o que a Play Console recusa. Nesse caso,
  pare e diga exatamente qual variável faltou.
- Se o Gradle falhar, diagnostique e corrija a causa real (memória do daemon, cache
  corrompido, dependência, `JAVA_HOME`). Repetir o mesmo comando não é correção.
  Caminhos legítimos: `./gradlew --stop`, `org.gradle.jvmargs` em
  `android/gradle.properties`, `./gradlew bundleRelease --no-daemon --max-workers=2`.
- Não desligue a assinatura de release para "fazer passar".

## 4. Verificação do artefato

- Confirme `android/app/build/outputs/bundle/release/app-release.aab`.
- Prove que **não** está assinado com a chave de debug (por exemplo
  `unzip -p <aab> 'META-INF/*.RSA' | keytool -printcert`, ou `jarsigner -verify -verbose`)
  e registre o CN/alias no summary. Sem ferramenta disponível, registre como observação.
- Confirme que a configuração de App Check continua no bundle: o
  `google-services.json` embarcado e a inicialização do App Check no código não podem
  ter sido perdidos pela mudança de versão. Uma verificação de grep no fonte basta —
  não é preciso rodar o app.

## 5. Entrega

- Copie para
  `/Users/gustavorosa/Desktop/builds-para-as-lojas/Aluza-1.9-19.aab`
  (`Aluza-<versionName>-<versionCode>.aab` se a versão real for outra). Crie a pasta se
  não existir.
- Acrescente uma seção do Aluza em
  `/Users/gustavorosa/Desktop/builds-para-as-lojas/LEIA-ME.txt` (português): arquivo,
  versão, chave usada, data, o que muda nesta versão (a atualização de segurança com
  App Check) e o passo manual que sobra para o dono. **Não apague** o que o Lesingo já
  escreveu nesse arquivo.

## 6. Commit

- Commit em **inglês**, no padrão do repositório (`chore(release): ...`). Working tree
  limpa no fim.
- `.env` é gitignored: a versão não entra no commit. Entra o script de cache e
  qualquer ajuste de build necessário.
- Não commite o `.aab`.

## Como não travar

- O dono está dormindo. Nada aqui depende de decisão dele.
- Falta de acesso à Play Console **não** é blocker: o entregável é o arquivo no Desktop.
- Só devolva BLOCKED se o build for tecnicamente impossível nesta máquina depois de
  diagnosticar e tentar corrigir a causa real.
