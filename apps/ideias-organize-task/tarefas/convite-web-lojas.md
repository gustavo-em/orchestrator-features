A página de convite e o site passam a levar para a App Store, e param de dizer
que o app não está nas lojas.

Relato do dono em 2026-09-10: a namorada abriu o convite no Safari do iPhone
sem o app instalado; apareceu só a página, sem banner para instalar, "e também
falou que o app não está nas lojas, porém já foi publicado na App Store e vai
ser publicado na Play Store daqui a 3 dias".

O que existe hoje, verificado:

- A página `/e/<token>` é uma Cloud Function: `functions/invite.js`, servida
  pelo rewrite em `firebase.json:60-65`. Ela está no ar (a namorada a abriu),
  ao contrário do que diz `docs/firebase/deep-link.md:11` — corrija essa
  linha.
- `functions/invite.js:40-41` tem `const APPLE_APP_ID = ''` e
  `const ANDROID_PACKAGE = ''`. As duas vazias explicam as três queixas de uma
  vez: sem `apple-itunes-app` no `<head>` (`:154-157`), sem botão de loja
  (`downloadButton()`, `:116-137`) e com a frase "O Aluza ainda não está nas
  lojas. Guarde este código — ele continua valendo." (`:238-242`).
- O site de marketing repete o problema: `docs/index.html:644` e `:1159` dizem
  "Em breve na App Store", com o objeto `LOJAS` vazio e o JS de troca em
  `:1207-1226`. `public/index.html` é cópia idêntica — os dois mudam juntos.
- Identificadores: bundle iOS `com.aluza.app` (time `ZVV2WA9432`), package
  Android `com.ideiasorganizetask`. O ID numérico da App Store não existia no
  repositório; foi consultado na API de lookup da Apple em 2026-09-10 e é
  **6808513680** ("Aluza: Lista Compartilhada", Gustavo Rosa). Confira você
  mesmo antes de gravar — `https://itunes.apple.com/lookup?bundleId=com.aluza.app`
  responde com o `trackId`.

O que fazer:

1. Coloque o ID numérico da App Store (`6808513680`) num lugar só, comentado,
   usado pela function e pelo site. Confirme o número pela API de lookup antes
   de gravar e **não invente nada** — uma constante errada manda a pessoa para
   o app de outra empresa.
2. Com o ID preenchido: `<meta name="apple-itunes-app" content="app-id=...">`
   volta ao `<head>` da página de convite. Acrescente
   `app-argument=<url do convite>` para que o banner abra o app já no convite
   certo quando ele estiver instalado.
3. Android: `ANDROID_PACKAGE` fica vazio **até o app estar no ar na Play**
   (previsto para 2026-09-13). A página tem que ficar honesta nos três
   estados, e este é o ponto principal da tarefa:
   - nenhuma loja: a frase de hoje;
   - só App Store: botão da App Store; para quem chega de Android, uma linha
     dizendo que chega ao Google Play em breve e que o código continua
     valendo — nunca "não está nas lojas";
   - as duas: os dois botões, o da plataforma de quem está lendo primeiro.
4. Mesma coerência no site (`docs/index.html` e `public/index.html`): o
   "Em breve na App Store" vira o botão real quando houver ID, com o texto de
   Android ainda em "em breve".
5. O passo de fazer o app aparecer na Play some sozinho quando o dono
   preencher o package: escreva no summary exatamente qual linha ele muda no
   dia 13 e que precisa de `firebase deploy --only functions,hosting`.
6. Teste de unidade da função que monta o HTML, nos três estados: com as duas
   constantes vazias, só com a Apple, e com as duas. Verifique presença do
   meta, do botão e ausência da frase errada em cada caso.
7. Confira também que a página continua servindo `?format=json` igual e que o
   `apple-app-site-association` e o `assetlinks.json` em `public/.well-known/`
   não mudam.

Tarefa sem tela do app: nada em `src/`. Regras fixas valem para copy e tom —
nenhuma frase culpa quem não tem o app.
