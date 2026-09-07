Discovery sobre as cores do app (SEM implementar): opinião fundamentada e uma
alternativa concreta. O dono não domina cor/design e pediu tradução honesta.

Relato do dono, nas palavras dele:

> "A cor amarela principal eu achei muito bonita e diferente dos apps de to-do
> por aí. Porém a cor amarela de fundo em background, e a amarela mais fraquinha
> dos botões de filtro da tela Tarefas, me dão uma sensação de VELHO e um pouco
> de SUJEIRA. Talvez deixar mais claras, ou entender se essa decisão de cor é a
> melhor."

O que a análise precisa cobrir (use $produto, $design-director e o contexto de
mercado):

- Diagnóstico técnico do incômodo: leia os tokens reais do tema (theme.ts) e as
  telas capturadas. "Velho/sujo" em amarelo geralmente vem de saturação baixa +
  amarelamento do neutro (fundo creme puxando para ocre) e de contraste
  insuficiente entre superfícies — explique EM LINGUAGEM LEIGA o que causa a
  sensação, apontando os tokens exatos.
- O que preservar: o acento amarelo forte é identidade e diferencial declarado
  pelo dono — a análise NÃO propõe trocar a cor da marca.
- Mercado: como apps premium usam acento quente sobre neutros (o que separa
  "quente e vivo" de "envelhecido"); alguma evidência de percepção de usuários
  sobre temas creme/amarelados.
- ALTERNATIVA CONCRETA (a entrega principal): uma proposta de ajuste dos tokens
  de fundo/superfície/filtros — valores hex propostos lado a lado com os atuais,
  o racional de cada um em uma linha, e o impacto esperado (contraste WCAG
  antes/depois nos pares principais). Se houver duas direções defensáveis
  (neutro mais claro/limpo vs. branco quente), apresente as duas com prós e
  contras e recomende UMA.
- Custo e risco: quantos tokens mudam, o que pode quebrar (tema escuro, os
  gabaritos visuais em docs/design/refs/), e o menor passo reversível para
  testar (ex.: ajustar só os 3-4 tokens de superfície e olhar as telas
  principais).

Entregável: o brief (run plan-only). A decisão fica com o dono; nenhum arquivo
de código muda.
