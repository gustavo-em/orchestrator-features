Ligar os provedores online atrás do contrato `FoodProvider`: Open Food Facts
(produtos embalados, filtro Brasil, User-Agent obrigatório) e USDA FoodData
Central (genéricos em inglês, chave em `.env` com DEMO_KEY como padrão), com
os mapeamentos exatos de `docs/FOOD_DATA_CONTRACT.md` e testes com os JSONs
reais de `docs/research/raw/`. `FoodSearchService`: local sempre primeiro;
online só com ≥ 3 caracteres, debounce 400 ms, timeout 2,5 s, cancelamento
por AbortSignal; resultados deduplicados, cacheados em SQLite (TTL 30 dias,
itens do diário nunca expiram) e exibidos no grupo "Produtos" abaixo de
"Base", com badge "Rótulo" e marca na linha 2, sem mover o que já está na
tela. Skeleton só após 300 ms; banner discreto quando offline.

Adicionar "Registrar só as calorias" (folha rápida com kcal obrigatório, P/C/G
opcionais, nome opcional) que grava um alimento `user:quick-*` e aparece em
"Hoje" como "Registro rápido · N kcal". Adicionar a tela "Fontes de dados e
licenças" em "Metas" com os textos exatos do contrato — obrigação de licença.

Decisões fechadas e evidência: `docs/specs/05-alimentos-online-e-registro-rapido.md`
(leia na fase de planejamento). Regras fixas valem; nada do cache sai do
aparelho.
