Dois ajustes de descobribilidade na tela de Projetos:

1. SETA DE EXPANDIR NO CARD: hoje o projeto só expande tocando no card inteiro e
   nada indica isso — as pessoas não descobrem. Adicionar um chevron (seta para
   baixo) visível no card, que rotaciona ao expandir/recolher (animação curta
   com preset existente). O toque no chevron expande/recolhe; o toque no card
   continua funcionando como hoje. Chevron em muted, alvo ≥ 48dp, a11y
   anunciando expandido/recolhido.
2. ZERO STATE ANIMADO para projeto sem tarefas: ao expandir um projeto vazio,
   em vez de só a mensagem de texto, um estado vazio com animação sutil
   (Lottie pequena própria em assets/lottie/ ou motion de formas do design
   system), a mensagem existente no tom das regras (sem cobrança) e a próxima
   ação clara (adicionar tarefa ao projeto). Reduced motion mostra estático.
   Sem violar "nada de card dentro de card" — o estado vazio vive no espaço da
   lista, sem caixa própria.

Fora do escopo: qualquer outra mudança no card, na ordenação ou no menu.
