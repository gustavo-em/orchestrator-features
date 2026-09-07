Refazer o conteúdo do onboarding: demonstrações REAIS do app em movimento, não
ilustrações abstratas. O onboarding passa a ter APENAS DOIS slides de conteúdo
(mais o fecho que leva ao login, se já existir):

- Slide 1 — criar tarefa: mostra a tela real de Tarefas, o toque no botão de
  nova tarefa, a folha abrindo, um texto sendo digitado e os filtros/fichas
  (data, prioridade, projeto) sendo usados. Legenda curta explicando o que está
  acontecendo.
- Slide 2 — projetos compartilhados: mostra a tela real de Projetos, um projeto
  compartilhado aberto, o convite e a faixa do combinado. Legenda curta.

Como produzir as demonstrações (o "gif"):

- Material: CAPTURAS REAIS do app no device — o driver de teste já tira
  screenshots; produza uma sequência de 6-10 quadros por slide cobrindo o fluxo
  descrito, em tema claro, com dados de exemplo apresentáveis (nada de "testee").
- Formato: escolha o mais simples que funcione bem em RN — (a) sequência de
  frames PNG tocada em loop com crossfade via Animated/Reanimated, ou (b) um
  .gif/.webp gerado dos frames (ffmpeg no repo é aceitável como script de build
  versionado). Sem dependência nativa nova se (a) resolver.
- EVIDENCIAR OS BOTÕES: em cada quadro onde há um toque, um destaque visual
  sobre o botão tocado (círculo/pulso na cor do acento, overlay desenhado por
  cima do frame) — o usuário precisa ver ONDE clicar.
- Os assets ficam versionados em assets/onboarding/ com um script/README de como
  regenerá-los.
- As animações Lottie existentes saem dos dois slides de feature (podem
  permanecer só no fecho, se houver); reduced motion mostra o primeiro quadro
  estático com o destaque.
- Copy nos dois idiomas; regras fixas de linguagem valem; "Pular" e a navegação
  do onboarding atual permanecem como estão.

DISCIPLINA DE EVIDÊNCIA (runs anteriores queimaram orçamento em recaptura):

- O slide 1 JÁ FOI CONFIRMADO em run anterior (quadros reais + anéis visíveis em
  4 momentos). NÃO recapture nem rejulgue o slide 1 — está aprovado.
- Falta somente: slide 2 (projetos compartilhados) e reduced motion. Foque só
  nisso.
- Os passos base do run já abrem o onboarding direto (Você → Ver a apresentação
  de novo). A partir do checkpoint "onboarding-aberto", basta avançar ao slide 2
  e capturar.
- Máximo de 10 requestedSteps por rodada; cada checkpoint pedido deve ser
  indispensável a um critério ainda aberto.
