1. A barra de carboidratos em "Hoje" e na tela da refeição usa `#9C5A2C` no
   tema claro, e a paleta em `docs/BRAND.md` e no design system diz o mesmo.
   Nenhum outro token de cor mudou.
2. A entrada do diário tem duas linhas — nome e porção — e nenhuma linha de
   macros. A altura da linha é 64 dp, e as calorias ficam alinhadas à direita
   na mesma borda em todas as entradas da lista (mesma coordenada x nos limites
   da árvore de UI).
3. O rótulo de acessibilidade da entrada CONTINUA anunciando os três macros
   depois das calorias. Sumir do áudio é defeito.
4. Uma refeição que já tem itens mostra, abaixo da última entrada, até dois
   chips de sugestão, e tocar um deles registra. O alimento que acabou de ser
   registrado não aparece entre as sugestões daquela refeição.
5. Numa instalação nova, sem histórico, a refeição com itens ainda mostra
   chips vindos dos starters — a linha nunca fica vazia por falta de histórico.
6. As quatro refeições continuam alcançáveis por rolagem no J6, e o summary
   relata quantas entradas ficam visíveis por refeição.
7. Arrastar horizontalmente a linha de chips não troca o dia selecionado.
8. Abrir a folha de um alimento em 100 g e tocar no chip "unidade" mostra
   "1 unidade" com os gramas daquela unidade, não "1,33 unidade · 99,8 g".
   Tocar de volta em "g" mostra os gramas da unidade escolhida.
9. `npm run validate` verde. Os testes que apontavam para o testID de macros da
   linha ou para a altura de 72 dp foram atualizados, não apagados sem
   substituto.
