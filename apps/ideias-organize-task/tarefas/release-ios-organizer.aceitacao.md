1. Existe um `.xcarchive` do Aluza em
   `~/Library/Developer/Xcode/Archives/<data de hoje>/`, gerado nesta execução, que o
   Organizer do Xcode lista.
2. O `Info.plist` do archive traz `CFBundleShortVersionString` = 1.3 e `CFBundleVersion`
   = 2 (ou os números reais usados, sempre maiores que os anteriores), e o binário é
   arm64 de device.
3. `CURRENT_PROJECT_VERSION` foi subido nas duas configurações do `project.pbxproj`, com
   `MARKETING_VERSION` inalterado.
4. O trabalho foi feito na branch `develop`.
5. Antes do build, os caches de Android dos dois apps e o `DerivedData` foram limpos, e
   o summary registra o espaço livre antes e depois.
6. A inicialização do App Check continua presente no fonte, com a verificação citada.
7. O `LEIA-ME.txt` no Desktop tem o passo manual do TestFlight e, se o export tiver
   sido possível, o `.ipa` está na mesma pasta.
8. Commit em inglês no padrão do repositório e `git status --porcelain` vazio.
9. Nada foi apagado do repositório do Lesingo além de `android/build`,
   `android/app/build`, `android/.gradle` e `ios/build`.
