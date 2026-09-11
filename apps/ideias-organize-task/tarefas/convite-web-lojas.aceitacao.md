1. Teste de unidade do gerador de HTML nos três estados (nenhuma loja, só
   Apple, as duas): presença de `apple-itunes-app` com `app-argument`,
   presença do botão certo e ausência de "ainda não está nas lojas" quando há
   pelo menos uma loja.
2. Com o ID preenchido, o HTML gerado para um token de exemplo contém o meta
   no `<head>` e o link `https://apps.apple.com/app/id<ID>`.
3. Visitante de Android com a Play ainda fora vê a linha de "em breve no
   Google Play" e o código do convite — nunca a frase de que o app não está
   nas lojas.
4. `docs/index.html` e `public/index.html` continuam idênticos entre si e
   ambos atualizados.
5. `?format=json` responde igual ao de antes (teste ou amostra no summary).
6. `docs/firebase/deep-link.md` corrigido: a página de convite está no ar.
7. O link gerado é `https://apps.apple.com/app/id6808513680` e o número foi
   conferido na API de lookup pelo bundle `com.aluza.app`.
8. O summary lista os passos manuais do dono: preencher o package Android no
   dia da publicação na Play, e `firebase deploy --only functions,hosting`.
9. `npm run validate` verde.
