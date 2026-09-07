docs: rewrite the README as a showcase, in English, with the store artwork

Objetivo: o README do Lesingo precisa ficar tão bom quanto o do Aluza. Ele é peça de
portfólio: quem abre o repositório tem que entender em trinta segundos o que o app faz,
ver as telas, e depois encontrar decisão técnica de verdade se quiser cavar.

Tarefa de **documentação**. Nenhuma mudança de código de produto, nenhuma tela para
validar no device.

## Referência obrigatória

Leia antes de escrever: `/Users/gustavorosa/Documents/ideias-organize-task/README.md`
(o README do Aluza, mesmo dono). Copie a **estrutura e o tom**, não o conteúdo:

- cabeçalho centralizado com imagem hero larga, nome do app, uma frase que diz o que
  ele faz, uma linha de palavras-chave técnicas e uma linha de links para os docs;
- logo abaixo, uma faixa com as telas do app;
- seção curta de "por que este app existe" ancorada em fato, não em adjetivo;
- stack, arquitetura, decisões (com o porquê e o trade-off), performance medida,
  testes, como rodar, status;
- prosa direta, sem marketing vazio; tabela quando comparar duas coisas.

O Aluza **não** usa emoji nos títulos. O README atual do Lesingo usa. Tire os emoji
dos títulos para os dois repositórios combinarem.

## Imagens

O dono produziu arte de loja com o Claude Design. Os arquivos estão soltos em
`/Users/gustavorosa/Downloads/`. Copie para `docs/img/readme/` no repositório
(crie a pasta) **apenas arquivos de imagem** — nunca copie `.json`, `.env` ou
qualquer coisa com credencial de dentro de `Downloads`:

- `bannerlesingo.png` (1024x500) → o hero do topo.
- `en-iphone-1284x2778-1-point.png`, `-2-speak.png`, `-3-words.png`, `-4-home.png`,
  `-5-privacy.png` → as cinco telas de iPhone.
- Opcionais, se ficarem bem: `watch-410x502-1-en-word.png` e irmãos (Apple Watch),
  `en-ipad-2064x2752-1.png` (iPad).

Monte uma faixa única com as telas de iPhone lado a lado (como o `screens.png` do
Aluza), com Pillow (`python3`, já instalado nesta máquina) ou `sips`. Redimensione
antes de juntar: a faixa final deve ter no máximo ~2400 px de largura e ~1,5 MB.
Se a composição não sair boa, use uma tabela HTML de uma linha no README com as
imagens lado a lado — é um resultado aceitável, não um motivo para parar.

As capturas antigas em `docs/assets/*.png` continuam válidas para as seções internas
(quiz, coleção, histórico). Não apague nada de `docs/assets/`.

## Conteúdo técnico que o README precisa carregar

Levante do próprio repositório, não invente: `package.json`, `docs/ARCHITECTURE.md`,
`docs/PERFORMANCE.md`, `docs/J6_PERFORMANCE_BASELINE.md`, `docs/adr/`, `docs/IOS.md`,
`modules/vision-object-detector/`.

- O que o app faz e para quem.
- Que a inferência é **100% no device**, sem backend — e o que isso custa e economiza.
- O módulo nativo de detecção de objetos (Nitrogen/Nitro): por que existe módulo
  nativo em vez de JS puro.
- Números medidos de verdade, com a fonte apontada nos docs de performance. **Não
  invente número**: se não achar a medição, descreva o que foi medido sem o valor.
- Decisões com trade-off explícito, no espírito dos ADRs.
- Como rodar (Android e iOS), incluindo `npm run android:bundle` para o AAB de loja e
  `scripts/clean-build-caches.sh` para liberar espaço entre builds de plataformas
  diferentes, se esse script já existir no repositório.
- Status do app nas lojas, sem prometer data.

## Regras

- **Inteiramente em inglês**, README e commit.
- Nada de badge falso: só badges que refletem fato verificável no repositório.
- Não invente feature que o app não tem, não invente número, não prometa roadmap.
- Se `docs/ROADMAP.md`, `docs/VALIDATION.md` e afins existirem, aponte para eles em
  vez de duplicar o conteúdo.
- Commit em inglês no padrão do repositório (`docs: ...`). Working tree limpa no fim.

## Como não travar

- O dono está dormindo. Não há decisão para pedir.
- Imagem que não existir: siga com as que existem e registre a ausência no summary.
- Ferramenta de composição indisponível: use a tabela HTML e siga.
