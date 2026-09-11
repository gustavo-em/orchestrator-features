Reformular a marca e animar a abertura.

Dois pedidos do dono em 2026-09-09, na mesma peça porque a abertura desenha a
marca: o logo tem de ficar mais sofisticado, mais simples e mais premium, e a
splash tem de ser animada.

1. A MARCA — refaça o símbolo. "Mais simples" é a instrução operante: menos
   traços, uma ideia só, reconhecível em 24 dp e em preto sobre branco. Antes
   de desenhar, olhe o que os concorrentes usam (a pesquisa de mercado em
   `docs/research/` já tem as lojas levantadas) e escolha deliberadamente o que
   **não** fazer, porque o pedido é ser singular. Entregue:
   - o símbolo em SVG, em `assets/brand/`, com a grade e as margens declaradas;
   - o ícone de aplicativo em todas as densidades que o Android pede, gerado do
     mesmo SVG, sem redesenho manual por tamanho;
   - a versão monocromática e a versão para o ícone adaptativo do Android;
   - uma folha em `docs/BRAND.md` mostrando a construção, os tamanhos mínimos
     e o que é proibido fazer com a marca.
   O símbolo antigo não é apagado: fica registrado em `docs/BRAND.md` como
   versão anterior, com o motivo da troca.

2. A ABERTURA ANIMADA — a splash desenha o símbolo novo e o anima até a
   primeira tela. Restrições, todas do aparelho que julga:
   - o J6 tem 2 GB e a animação não pode atrasar a abertura; o tempo até a
     primeira tela utilizável não pode piorar em relação ao que é medido hoje;
   - só `transform` e `opacity` animam, como manda `docs/ARCHITECTURE.md`;
   - a animação **não é uma espera**: se o aplicativo estiver pronto antes, ela
     termina antes. Nada de segurar a tela para a animação caber;
   - respeite "reduzir movimento": nesse caso a marca aparece sem percurso;
   - a transição da splash para "Hoje" não pode piscar cor de fundo diferente,
     nem no tema claro nem no escuro.

Regras fixas valem. Não mexa em paleta: a marca usa os tokens que existem.
