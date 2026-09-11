1. "Hoje" abre em menos de 3 s no J6 mostrando: faixa de dias com o dia atual
   destacado, título "Hoje", número-resposta "2.000" com "disponíveis hoje",
   barra de progresso, três barras de macro (Proteína, Carboidratos,
   Gorduras) e as quatro refeições na ordem fixa, cada uma com "Adicionar".
2. Tocar um dia anterior na faixa muda o título para a data e mostra o botão
   "Hoje"; tocar "Hoje" volta.
3. "Metas" abre a tela com os quatro campos editáveis; editar a meta de kcal e
   voltar atualiza o número-resposta de "Hoje".
4. Tema escuro (uimode night) renderiza a mesma tela com contraste AA; nenhum
   vermelho ou verde no resumo.
5. Seed importado no primeiro lançamento sem travar a UI (`foods` com > 2.000
   linhas e `foods_fts` populada — verificável por teste unitário do importador
   e por log filtrado).
6. Todo controle tem `accessibilityLabel`; alvos ≥ 48 dp; textos fixos exatos:
   "Hoje", "Metas", "Adicionar", "Café da manhã", "Almoço", "Café da tarde",
   "Jantar".
7. `npm run validate` verde, com testes unitários para totais do dia e para o
   importador do seed.
