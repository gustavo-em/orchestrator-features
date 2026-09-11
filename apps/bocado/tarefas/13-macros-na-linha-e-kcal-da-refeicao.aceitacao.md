1. A entrada do diário mostra proteína e carboidrato (e gordura, se a
   descoberta concluir que cabe) sem que ninguém precise tocar nela, em "Hoje"
   e na tela da refeição.
2. A entrada continua com 64 dp de altura. Medido na árvore de UI, não
   relatado.
3. As kcal continuam alinhadas à direita na mesma coordenada x em todas as
   entradas da lista.
4. Com o nome mais longo da base (`Pão, trigo, francês, ...`), o nome continua
   cabendo inteiro em 360 dp na mesma proporção de antes desta tarefa, ou a
   pesquisa explica por que a perda é aceitável, com o número medido.
5. O rótulo de acessibilidade da entrada continua anunciando os três macros
   por extenso depois das calorias.
6. Nenhum macro é distinguido só por cor.
7. O subtotal da refeição e as kcal de uma entrada usam o mesmo tratamento
   tipográfico, e uma captura mostra os dois na mesma tela para comparar.
8. A pesquisa da descoberta fica em `docs/research/`, com as direções
   descartadas e o motivo de cada descarte.
9. `docs/DECISIONS.md` registra a reversão da decisão 9 com o custo aceito.
10. `npm run validate` verde.
