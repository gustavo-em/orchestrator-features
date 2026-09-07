Polish de motion: animações de entrada/carregamento das telas principais para o
app parecer mais profissional e sofisticado — sem exagero.

Decisões fechadas:

- Sutileza é o critério: durações curtas (150-350ms), easing consistente,
  stagger discreto em listas. Nada de bounce, nada de animação que atrase o uso,
  nada em cima de interação crítica.
- Um vocabulário só: defina (ou estenda) motion.ts com os presets e use-os em
  todas as telas — nada de valores soltos por tela. FadeInDown/stagger que a
  faixa do combinado já usa é a referência de tom.
- Onde aplicar: entrada das telas (tabs, perfil, projeto aberto), aparecimento de
  listas e cards, transições dos sheets (coordenar com o trabalho de perf já
  feito — nunca regredir a fluidez medida).
- Carregamentos: esqueletos com a forma do conteúdo onde houver espera real;
  nunca spinner de tela cheia novo.
- Reduced motion desliga tudo graciosamente.
- Fora do escopo: mudar layout, cores ou hierarquia de qualquer tela.
