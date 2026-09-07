1. Chevron visível em todo card de projeto; rotaciona ao expandir/recolher;
   toque no chevron e no card funcionam; a11y com estado expandido; alvo ≥
   48dp (bounds na árvore).
2. Projeto vazio expandido mostra o zero state animado + mensagem + ação de
   adicionar tarefa; a ação funciona (abre captura já no projeto, se esse
   caminho existir, ou o caminho definido no design).
3. Reduced motion: chevron sem rotação animada e zero state estático, ambos
   funcionais.
4. Sem caixa nova aninhada; regras fixas ok; tema claro/escuro; copy pt-BR/
   en-US; `npm run validate` verde.
