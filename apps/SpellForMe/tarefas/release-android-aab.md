chore(release): build the signed Play Store bundle for the next Android version

Objetivo final: um `.aab` assinado com a chave de upload, pronto para o dono subir
na Play Console de manhã, entregue em `/Users/gustavorosa/Desktop/builds-para-as-lojas/`.

Esta é uma tarefa de **release engineering**. Não há mudança de UI, não há tela para
olhar, não há device para validar. Nenhum agente de produto, UX ou visual precisa
opinar. O que vale é: o artefato existe, está assinado com a chave certa e tem uma
versão que a Play Console aceita.

## 1. Higiene de cache antes de construir

A máquina tem pouco espaço livre (~11 GB no início) e o dono alterna entre este app
e o Aluza, em Android e iOS, no mesmo disco. Antes do build:

- Confira o espaço com `df -h /System/Volumes/Data`.
- Crie (ou atualize, se já existir) `scripts/clean-build-caches.sh` neste repositório:
  um script bash com `set -euo pipefail`, comentado em inglês, que aceita
  `--android`, `--ios`, `--all` e `--dry-run`, imprime quanto cada alvo ocupa antes
  de apagar e imprime o espaço livre no fim.
  - Alvos Android: `android/build`, `android/app/build`, `android/.gradle`,
    `~/.gradle/caches/build-cache-*`, `~/.gradle/caches/transforms-*`.
  - Alvos iOS: `ios/build`, `ios/Pods` só quando pedido explicitamente,
    `~/Library/Developer/Xcode/DerivedData`, `~/Library/Caches/CocoaPods`,
    `~/Library/Developer/Xcode/Archives` mais antigos que 30 dias.
  - O script **nunca** apaga `node_modules`, `.env`, keystore, nem
    `~/Library/Developer/Xcode/iOS DeviceSupport`.
  - `chmod +x` no script.
- Rode o script no modo que fizer sentido para liberar espaço sem sabotar este build
  (o cache do Gradle acelera o próprio build que vem a seguir; use bom senso e
  explique a escolha no summary).

## 2. Versão

O `.env` (gitignored) está hoje em `VERSION_CODE=17` / `VERSION_NAME=1.7`. O dono
acredita que a Play Console já aceitou o build **18**, ou seja, o `.env` está atrasado.

- Escreva `VERSION_CODE=19` e `VERSION_NAME=1.9` no `.env`.
- Regra que vale acima de qualquer outra: **o versionCode só sobe**. Se encontrar
  qualquer evidência no repositório de um código maior que 19 já publicado, use
  `maior + 1` em vez de 19 e diga isso no summary.
- Atualize `.env.example` só se o formato mudar; os números de exemplo lá continuam 1 / 1.0.

## 3. Build

- Gere o bundle com `npm run android:bundle` (que chama `scripts/release-android.sh`).
- O script já falha cedo se a chave de upload estiver faltando. Ela **está**
  configurada: `LESINGO_UPLOAD_STORE_FILE=/Users/gustavorosa/saylens-upload.keystore`,
  com alias e senhas no `.env`. Não peça credencial ao dono.
- Se o Gradle falhar, leia o erro e corrija de verdade (memória do daemon, cache
  corrompido, dependência, `JAVA_HOME`). Repetir o mesmo comando não é correção.
  Caminhos legítimos quando faltar memória:
  `./gradlew --stop`, `org.gradle.jvmargs` em `android/gradle.properties`,
  `./gradlew app:bundleRelease --no-daemon --max-workers=2`.
- Não desligue a assinatura de release para "fazer passar". Um AAB assinado com a
  chave de debug é lixo: a Play Console recusa.

## 4. Verificação do artefato

- Confirme que o arquivo existe:
  `android/app/build/outputs/bundle/release/app-release.aab`.
- Prove que ele **não** está assinado com a chave de debug. Use o que estiver
  disponível na máquina, por exemplo
  `unzip -p <aab> META-INF/*.RSA | keytool -printcert` ou o `jarsigner -verify -verbose`,
  e registre no summary o CN/alias encontrado. Se nenhuma ferramenta estiver
  disponível, registre isso como observação — não como falha.
- Confirme versionCode/versionName dentro do bundle quando houver `bundletool` ou
  `aapt2` na máquina; se não houver, confie no que o script imprimiu e diga isso.

## 5. Entrega

- Copie o bundle para
  `/Users/gustavorosa/Desktop/builds-para-as-lojas/Lesingo-1.9-19.aab`
  (ajuste o nome se a versão real for outra: `Lesingo-<versionName>-<versionCode>.aab`).
  Crie a pasta se ela não existir.
- Escreva/atualize `/Users/gustavorosa/Desktop/builds-para-as-lojas/LEIA-ME.txt`
  em português, acrescentando uma seção para o Lesingo com: nome do arquivo, versão,
  chave usada, data, o que muda nesta versão e o passo manual que sobra para o dono
  (subir na Play Console, faixa de teste ou produção). Não apague o que outro app já
  escreveu nesse arquivo.

## 6. Commit

- Commit em **inglês**, no padrão de commits que já existe no repositório
  (`chore(release): ...`). Deixe a working tree limpa no fim.
- `.env` é gitignored: a mudança de versão não entra no commit. O que entra é o
  script de cache novo e qualquer ajuste de build que você tenha precisado fazer.
- Não commite o `.aab` (é grande e a Play Console é a fonte da verdade).

## Como não travar

- Nada aqui depende de decisão do dono. Ele foi dormir. Escolha o caminho mais
  conservador e siga.
- Falta de acesso à Play Console **não** é blocker: o entregável é o arquivo no
  Desktop, não o upload.
- Só devolva BLOCKED se o build for tecnicamente impossível nesta máquina depois de
  você ter diagnosticado e tentado corrigir a causa real.
