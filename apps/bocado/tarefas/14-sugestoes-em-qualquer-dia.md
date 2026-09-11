A refeição vazia oferece o que a pessoa costuma comer nela, em qualquer dia.

Pedido do dono em 2026-09-09: "não apareça 'Nada registrado ainda' somente,
coloque sugestões de acordo com o que a pessoa colocou na última vez".

Verificado no aparelho antes de escrever esta tarefa: **no dia de hoje** as
quatro refeições já mostram os chips de sugestão que a tarefa 10 entregou
(`meal-lunch-chip-taco:3`, `meal-lunch-chip-taco:53` e assim por diante).
**Em qualquer outro dia** — passado ou dentro da semana corrente — as quatro
refeições mostram só o texto "Nada registrado ainda", sem chip nenhum. Foi
conferido em 8 de setembro e em 15 de junho.

Então isto não é feature nova, é alcance: a linha de sugestões vale para o dia
que está na tela, seja ele qual for.

1. A refeição sem entradas mostra os chips de sugestão em **qualquer** dia
   selecionado, não só em hoje. O texto "Nada registrado ainda" sai quando há
   chips para mostrar; ele só aparece se não houver nenhum.
2. A ordem das sugestões continua vindo da frecência que já existe
   (`useDaySuggestions`), com os starters cobrindo quem não tem histórico —
   nada de motor novo de recomendação.
3. Tocar num chip registra naquele dia e naquela refeição, não em hoje. Este é
   o ponto onde é fácil errar: confira que a entrada vai para o dia
   selecionado.
4. O alimento que acabou de ser registrado não aparece entre os chips daquela
   refeição, como já vale hoje.

Regras fixas valem. Sem mudar a aparência do chip nem a altura da linha.
