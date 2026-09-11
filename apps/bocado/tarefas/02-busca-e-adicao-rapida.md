Construir a tela "Buscar alimento" e o caminho de três toques: "Adicionar" em
uma refeição de "Hoje" → "+" na linha do alimento → "Concluir". O alimento é
gravado no toque do "+" com a porção padrão (primeira medida caseira do seed,
ou 100 g), sem tela de porção obrigatória, com bandeja "1 item · 58 kcal ·
Concluir" e snackbar "Desfazer".

Busca local search-as-you-type (SQLite FTS5, prefixo de palavra, insensível a
acento: "pao" acha "Pão, trigo, francês"; debounce 150 ms; resultado < 100 ms),
antes de digitar a seção "Sugestões" com os `starters` da refeição, resultados
agrupados em "Seus" / "Base", linha de resultado com nome faceteado, porção
padrão + kcal, kcal/100 g e badge da fonte. Ranking: relevância textual +
boost do seed ("arroz" → "Arroz, tipo 1, cozido" em primeiro).

Decisões fechadas, anatomia da linha, estados e evidência esperada:
`docs/specs/02-busca-e-adicao-rapida.md` e `docs/FOOD_DATA_CONTRACT.md` (leia
na fase de planejamento). Regras fixas valem: rótulos de acessibilidade
"Adicionar <nome>", textos fixos "Buscar alimento", "Sugestões", "Concluir",
"Desfazer"; FlashList; sem biblioteca nova sem justificativa.
