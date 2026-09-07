1. Dono atribui e remove qualquer membro numa tarefa do projeto (evidência de
   tela com a pilha de iniciais mudando).
2. Membro (conta descartável) consegue se atribuir e sair; controles para
   remover terceiros NÃO aparecem para não-dono.
3. Regra de segurança versionada garantindo: dono livre; não-dono só altera o
   próprio uid em assignedIds (teste unitário da regra/modelo + passo manual de
   publicação listado).
4. Tarefa com vários atribuídos usa pilha + +N; sem atribuídos, sem espaço
   reservado.
5. Atribuição sincroniza pelo pull existente (persistida no documento do
   projeto).
6. Sem mudança no placar/pontos nem na faixa do combinado.
7. Regras fixas, a11y (ações anunciáveis), tema claro/escuro, copy pt-BR/en-US,
   `npm run validate` verde.
