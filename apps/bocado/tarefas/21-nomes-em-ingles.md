Com o app em inglês, os alimentos da base embarcada aparecem com nome em
inglês — se um glossário termo a termo cobrir a base com honestidade. Se não
cobrir, a tarefa termina na descoberta, sem UI, e isso é um resultado válido.

Pedido do dono em 2026-09-10: "tente entender se tem como, quando o aplicativo
estiver em inglês, o nome das comidas também ser em inglês. Se não tiver como
ou for muito difícil, não tem problema."

Fatos verificados no código:

- O tipo `LocalizedText { pt?, en? }` e a coluna `name_en` já existem
  (`src/domain/food/NormalizedFood.ts`, `src/data/db/schema.ts`), e
  `localizedName()` em `src/domain/food/rank.ts` já prefere `en` em en-US e
  cai para `pt`.
- `src/data/seed/mapSeedFood.ts` grava `name_en = null` para os **2.319**
  alimentos da TACO e do IBGE. Então em inglês a busca e o diário mostram
  português para toda a base embarcada; só produtos do Open Food Facts com
  `product_name_en` e os alimentos do USDA vêm em inglês.
- Os nomes da TACO são **composicionais**: termos separados por vírgula
  ("Arroz, tipo 1, cozido", "Frango, peito, sem pele, grelhado"). Um glossário
  pt→en por termo traduz a maior parte da base de forma determinística, sem
  rede e sem modelo em runtime.

O que fazer:

1. **Descoberta primeiro**, escrita em `docs/research/08-nomes-em-ingles.md`:
   conte os termos distintos nos 2.319 nomes, nas categorias e nos rótulos de
   medida caseira; escreva o glossário (`data/glossary/pt-en.json` ou lugar
   equivalente, com termo, tradução e observação quando ambíguo) e meça a
   cobertura: **alimento coberto = todos os seus termos traduzidos**. Meta:
   ≥ 90 % dos alimentos. Se com esforço razoável (glossário de até ~800
   termos) a cobertura ficar abaixo de 70 %, **pare aqui**: registre o número,
   os termos que faltam por frequência e o motivo, e encerre sem código de UI.
   O dono aceitou esse desfecho.
2. Se passar: `scripts/build-food-seed.mjs` aplica o glossário no build e grava
   `nameEn` opcional no seed, **só quando a tradução é completa** — metade e
   metade não entra; `mapSeedFood.ts` grava `name_en`; o FTS5 indexa `name_en`
   para consultas em inglês (confira `LocalFoodProvider.ts` e a criação do
   índice em `schema.ts`; migração nova se o índice precisar mudar, nunca
   editando a entrada `[0]`); categorias e rótulos de medida caseira
   (`Serving.label`) também via glossário quando cobertos.
3. Ordem dos termos: em inglês o qualificador costuma vir antes ("cooked
   rice") — decida uma regra simples e uniforme (por exemplo manter a forma
   de catálogo "Rice, type 1, cooked", que é a mesma do USDA) e registre.
4. Ambiguidades ficam pendentes, sem `en` (ex.: "farinha de mandioca" ×
   "cassava flour"/"manioc flour", "requeijão", "cuscuz"). Liste-as no
   documento. No summary, uma amostra de 50 nomes aleatórios com pt e en lado
   a lado para o dono revisar.
5. Tamanho do seed antes e depois; a importação do seed no J6 não pode piorar
   mais que 10 % (meça com o mesmo método da tarefa 15).
6. Em pt-BR nada muda; sem mudança visual em nenhuma tela. Voltar de English
   para Português mostra os nomes originais sem reimportar.

Regras fixas valem. Não use serviço de tradução nem modelo: o glossário é um
arquivo do repositório, revisável.
