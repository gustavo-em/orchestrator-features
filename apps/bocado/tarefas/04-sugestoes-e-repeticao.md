Fazer o app lembrar o que a pessoa come: a seção "Sugestões" da busca passa a
ser ranqueada pelo histórico com um score de frecência com contexto
(recência × mesma refeição × proximidade de hora × mesmo dia da semana,
favorito como desempate, alimento já registrado hoje excluído), completada
pelos `starters` do seed enquanto houver pouco histórico. Cada sugestão
registra em um toque com a última porção usada daquele alimento.

Adicionar chips horizontais "Recentes" e "Favoritos" (toque registra, toque
longo abre a porção), a seção "Seus" acima de "Base" enquanto digita, o
coração de favorito na folha de porção, e a linha composta "Repetir almoço de
ontem · 4 itens · 612 kcal" quando a refeição de hoje está vazia e a de ontem
tem ≥ 2 itens (um toque copia tudo, desfazer desfaz o conjunto). Refeição
vazia em "Hoje" mostra até três chips de sugestão em vez de "Nada registrado
ainda". "Limpar sugestões" em "Metas".

Decisões fechadas, fórmula do score e evidência:
`docs/specs/04-sugestoes-e-repeticao.md` (leia na fase de planejamento).
Regras fixas valem; o score é função pura em `src/domain` com testes.
