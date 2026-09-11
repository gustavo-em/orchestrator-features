1. Buscar "nutella" com Wi-Fi mostra o grupo "Produtos" com itens do Open Food
   Facts (badge "Rótulo", marca e porção do rótulo na linha 2), abaixo dos
   resultados locais, sem a lista pular.
2. "+" num produto grava com a porção do rótulo; a folha de porção do produto
   tem o link "Ver no Open Food Facts".
3. Buscar "xyzxyz" mostra "Nada para 'xyzxyz'." com "Registrar só as calorias";
   a folha rápida com 300 kcal grava "Registro rápido · 300 kcal" em "Hoje" e
   o número-resposta desconta 300.
4. "Metas" → "Fontes de dados e licenças" lista TACO, IBGE, Open Food Facts e
   USDA com os textos e links do contrato e o aviso geral.
5. Busca local continua respondendo em < 100 ms enquanto a busca online está
   em andamento; skeleton só depois de 300 ms; timeout de 2,5 s não trava a UI.
6. Testes unitários dos mapeadores OFF e USDA com os fixtures reais (energia em
   kJ → kcal, sódio g → mg, Atwater quando falta energia, UPC-A com zero) e do
   serviço de dedupe; `npm run validate` verde.
7. Estado offline não verificável no device vira observação, não FAIL.

Nota de evidência (device): a tela "Fontes de dados" tem quatro citações
verbatim e passa de uma tela no J6. O bloco do USDA nasce abaixo da dobra, e o
Android reporta o que está fora da área visível com limites zerados — isso é
coleta, não defeito. Os passos base agora capturam `fontes-topo` e, depois de
`scrollToEnd`, `fontes-fim`; o link do USDA deve ser julgado pela segunda
captura.

