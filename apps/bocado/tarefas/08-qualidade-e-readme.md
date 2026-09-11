docs+test: fechar a qualidade do repositório sem mudar comportamento nem visual.

Testes de domínio obrigatórios (jest): cálculo de porção e conversão de
medidas; totais do dia; Mifflin-St Jeor e pisos; score de sugestões (fixture
de 2.000 entradas em < 30 ms); ranking de busca ("arroz", "pao", "cafe com
leite" em primeiro); mapeadores Open Food Facts e USDA com fixtures reais;
importação do seed (contagem e invariantes do contrato). Um teste de
renderização por tela principal. `npm run validate` verde; zero `any` novo;
sem `console.log`; sem string fora de `src/i18n`; código morto e dependências
não usadas removidos; `.env.example` e `.gitignore` corretos.

README em inglês como peça de portfólio: nome + frase + três screenshots do J6
copiados de `runs/*/artifacts` para `docs/img/`; "Why"; "How it works" com
link para `docs/FOOD_DATA_CONTRACT.md`; "Data sources & licenses"; "Run it";
"Roadmap". Atualizar `docs/ARCHITECTURE.md` com o que foi construído e criar
`docs/DECISIONS.md` com dez decisões e o porquê.

Detalhes: `docs/specs/08-qualidade-e-readme.md`. Regras fixas valem.
