build(ios): archive the App Check release so it lands in the Xcode Organizer

Objetivo final: um `.xcarchive` do Aluza, feito a partir da branch `develop`, visível
no **Organizer do Xcode**, com a atualização de segurança (App Check) dentro. Se der
para exportar e mandar para o TestFlight sem credencial nova, melhor ainda — mas o
entregável obrigatório é o archive no Organizer.

Tarefa de **release engineering em iOS**. Não há tela para validar, nenhum agente de
produto ou UX precisa opinar.

## 0. Contexto de máquina (o motivo de esta tarefa vir por último)

O disco tem pouco espaço e o dono alterna entre dois apps em duas plataformas. Build de
Android e build de iOS não cabem juntos. Os bundles de Android dos dois apps **já foram
gerados** antes desta tarefa: o cache do Gradle agora é descartável.

## 1. Liberar espaço antes de qualquer coisa

- Meça: `df -h /System/Volumes/Data`.
- Rode `scripts/clean-build-caches.sh --android` neste repositório (criado na tarefa de
  Android; se não existir, crie-o agora com a mesma especificação: bash com
  `set -euo pipefail`, modos `--android`, `--ios`, `--all`, `--dry-run`, nunca apagando
  `node_modules`, `.env`, keystore, `google-services.json`, `GoogleService-Info.plist`
  nem `~/Library/Developer/Xcode/iOS DeviceSupport`).
- Limpe também o Android do outro app, que é o que realmente segura espaço:
  `/Users/gustavorosa/Documents/SpellForMe/android/build`,
  `/Users/gustavorosa/Documents/SpellForMe/android/app/build`,
  `/Users/gustavorosa/Documents/SpellForMe/android/.gradle`.
  Não toque em mais nada dentro do outro repositório.
- Limpe o iOS dos **dois** apps antes de compilar:
  `~/Library/Developer/Xcode/DerivedData` inteiro (~11 GB), `ios/build` daqui e
  `/Users/gustavorosa/Documents/SpellForMe/ios/build`.
- Meça de novo e registre no summary quanto liberou. Se depois disso houver menos de
  15 GB livres, continue liberando (archives com mais de 30 dias, `~/.npm`,
  `~/Library/Caches/CocoaPods`) antes de começar o build.

## 2. Versão

- `MARKETING_VERSION` está em `1.3` e `CURRENT_PROJECT_VERSION` em `1`
  (`ios/IdeiasOrganizeTask.xcodeproj/project.pbxproj`, nas duas configurações).
- O build `1.3 (1)` já foi enviado (veja o commit `chore(release): iOS 1.3 (1)`).
  Suba **só o build**: `CURRENT_PROJECT_VERSION = 2`, nas duas configurações.
  Mantenha `MARKETING_VERSION = 1.3`.
- O número de build **só sobe**. Se o App Store Connect recusar como duplicado, suba
  de novo em vez de baixar.

## 3. Pods e ambiente

- Estamos na branch `develop`. Confirme com `git branch --show-current` e permaneça nela.
- `cd ios && pod install` depois da limpeza (o `Podfile.lock` manda; não rode
  `pod update`, não mexa em versão de dependência).
- `ios/.xcode.env.local` aponta `NODE_BINARY` para
  `/opt/homebrew/Cellar/node/25.9.0_3/bin/node`. Confirme que esse binário existe; se
  não existir, corrija para `$(command -v node)` — sem isso a fase "Bundle React Native
  code and images" falha no meio do archive.

## 4. Archive

- Assinatura é **automática**, team `ZVV2WA9432`, bundle `com.aluza.app`. Já existe
  perfil de loja instalado (`iOS Team Store Provisioning Profile: com.aluza.app`).
- Faça o archive por linha de comando, gravando **dentro da pasta que o Organizer lê**,
  para que o dono encontre a build de manhã sem procurar:

  ```
  xcodebuild -workspace ios/IdeiasOrganizeTask.xcworkspace \
    -scheme IdeiasOrganizeTask \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$HOME/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)/Aluza 1.3 (2).xcarchive" \
    -allowProvisioningUpdates \
    archive
  ```

- Se a saída for grande demais, redirecione para um log em `/tmp` e leia só as linhas
  de erro; não despeje o log inteiro no summary.
- Erros comuns e o que fazer:
  - **falta de certificado de distribuição**: não invente credencial e não peça nada ao
    dono. Repita o archive com `-allowProvisioningUpdates`; se ainda faltar, faça o
    archive assinado com o que existir na máquina — um archive no Organizer, mesmo que
    a distribuição final precise ser feita pelo Xcode, cumpre o objetivo desta tarefa.
    Registre exatamente o que faltou.
  - **script de bundle do React Native falhando**: quase sempre é `NODE_BINARY` ou
    `node_modules` incompleto. Diagnostique antes de tentar de novo.
  - **falta de espaço no meio do build**: volte ao passo 1, libere mais e recomece.
  - **erro de Pods/Firebase depois da limpeza**: `pod install` de novo; se persistir,
    `pod deintegrate && pod install` é permitido, `pod update` não é.

## 5. Verificação

- Confirme que o `.xcarchive` existe no caminho acima e que
  `<archive>/Info.plist` traz `ApplicationProperties` com `CFBundleShortVersionString`
  = 1.3 e `CFBundleVersion` = 2 (ou os números reais usados).
- Confirme que o binário dentro do archive é `arm64` para device (não simulador).
- Confirme por grep no fonte que a inicialização do App Check continua no lugar.

## 6. TestFlight (bônus, nunca bloqueante)

Tente somente o caminho que **não** exige uma credencial nova:

- Se `xcrun altool` ou `xcrun notarytool` já tiver um perfil de credencial gravado, ou
  se existir no repositório/ambiente um `ExportOptions.plist` com chave de API do App
  Store Connect **e** o Issuer ID correspondente, exporte com
  `xcodebuild -exportArchive` e envie.
- Existe uma chave em `/Users/gustavorosa/Downloads/AuthKey_CX932L7B7R.p8`, mas **não há
  Issuer ID em lugar nenhum da máquina**, e Issuer ID não pode ser adivinhado. Sem ele,
  **não tente** o upload e **não peça** o valor ao dono.
- Caminho de saída obrigatório quando o upload não for possível: exporte, se conseguir,
  um `.ipa` para `/Users/gustavorosa/Desktop/builds-para-as-lojas/` e escreva no
  `LEIA-ME.txt` o passo exato de manhã (Xcode → Window → Organizer → selecionar
  "Aluza 1.3 (2)" → Distribute App → App Store Connect → Upload), mais o comando de
  linha que funcionaria assim que ele preencher o Issuer ID.
- Não conseguir subir para o TestFlight **não é falha desta tarefa**.

## 7. Commit

- Commit em **inglês**, no padrão do repositório
  (`chore(release): iOS 1.3 (2)` combina com o histórico). Working tree limpa no fim.
- Entram no commit: a mudança de `CURRENT_PROJECT_VERSION`, o script de cache se ainda
  não tiver sido commitado, e qualquer ajuste de build necessário.
- Não commite `.xcarchive`, `.ipa`, `ios/build` nem `Pods` gerados.

## Como não travar

- O dono foi dormir depois de cinco horas brigando com o build do outro app. Ele não
  volta para responder pergunta. Escolha o caminho conservador e siga.
- Nenhum passo de console da Apple é blocker: o entregável é o archive local.
- BLOCKED só se o archive for tecnicamente impossível nesta máquina depois de você ter
  diagnosticado a causa real e tentado corrigi-la.
