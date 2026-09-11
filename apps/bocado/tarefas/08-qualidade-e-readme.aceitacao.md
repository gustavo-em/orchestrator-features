1. `npm run validate` verde, com a lista dos testes novos no summary e a
   contagem de testes de domínio cobrindo porção, totais, meta, sugestões,
   ranking, mapeadores e seed.
2. README em inglês com as seis seções, três screenshots existentes em
   `docs/img/` e nenhum link quebrado (verificação no summary).
3. `docs/ARCHITECTURE.md` reflete rotas, tabelas e provedores reais;
   `docs/DECISIONS.md` existe com dez decisões.
4. Nenhum `console.log`, nenhuma string de UI fora de `src/i18n`, nenhuma
   dependência sem uso (`npx depcheck` ou equivalente no summary).
5. `.gitignore` cobre `.env`, `android/app/src/main/assets/index.android.bundle`
   e os `drawable-*` gerados pelo bundling; `.env.example` documenta
   `USDA_API_KEY`.
6. Nenhuma mudança de comportamento ou visual (diff restrito a testes, docs,
   limpeza e configuração).
