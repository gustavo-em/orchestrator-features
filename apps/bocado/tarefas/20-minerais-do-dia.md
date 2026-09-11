O dia ganha um bloco de minerais, fibra e sódio embaixo das refeições, ligado
por uma chave em Metas. Nada muda na folha de porção.

Pedido do dono em 2026-09-10: "acho que agora você está buscando as vitaminas
de certos alimentos, certo? Se sim: (a) quando eu for adicionar um alimento,
deixe um campo que abre com uma setinha para ver mais, com as vitaminas; (b)
ou, embaixo de café da manhã, almoço, café da tarde e jantar, deixe uma seção
do mesmo jeito que mostra o nível de carboidratos, proteínas e gorduras."

Fato verificado no código: o app **não busca vitamina nenhuma**. O contrato
`Per100g` (`src/domain/food/NormalizedFood.ts`) tem kcal, macros, fibra,
açúcar, sódio e gordura saturada, e nada mais. A pesquisa
`docs/research/05-descoberta-ajustes-ui.md` §6 já mediu o que dá para
entregar com honestidade: cinco minerais com 97 % de cobertura na TACO
(ferro, cálcio, magnésio, potássio, zinco), sódio com 98 %, fibra com 56 % —
e vitamina A com 28 % entre os alimentos mais usados. Vitamina com 28 % não é
dado parcial, é tela quebrada.

Parecer do diretor de design (2026-09-10), fechado: **(a) recusado; (b) aceito
com adaptação.** A folha de porção é o caminho mais rápido do app e tem de
continuar sendo uma decisão só; micro por item não responde pergunta nenhuma
(ninguém tem meta de magnésio por colherada). O bloco do dia entra no lugar
que o dono pediu, mas como grade, não como sete linhas de 72 dp.

Fase 0 — dados (a pesquisa 05 §6 é o spec; siga os arquivos que ela lista):

1. Seed ganha `micro:[fe,ca,mg,k,zn]` posicional (≈ +69 KB, +8,8 %);
   `scripts/build-food-seed.mjs` extrai de `data/raw/TACO.json` (`iron_mg`,
   `calcium_mg`, `magnesium_mg`, `potassium_mg`, `zinc_mg`) e do IBGE onde
   houver; `seedTypes.ts` e `mapSeedFood.ts` acompanham.
2. `Per100g` ganha `iron_mg?`, `calcium_mg?`, `magnesium_mg?`, `potassium_mg?`,
   `zinc_mg?`. `offMapper` mapeia quando o produto trouxer (`iron`, `calcium`,
   `magnesium`, `potassium`, `zinc`, em mg por 100 g); `usdaMapper` mapeia os
   ids 1089 (ferro), 1087 (cálcio), 1090 (magnésio), 1092 (potássio), 1095
   (zinco). `foodCache.ts` e `LocalFoodProvider.ts` gravam e leem.
3. Migração **nova, em índice 3** de `MIGRATIONS` (`src/data/db/schema.ts`):
   `ALTER TABLE foods ADD COLUMN iron_mg_100 REAL` e as outras quatro, nulas,
   sem `DEFAULT 0`. Nunca edite a entrada `[0]`; `SCHEMA_VERSION` continua
   igual a `MIGRATIONS.length`; a `version` do seed sobe para reimportar.
4. Total do dia: decida entre gravar o snapshot por entrada (colunas novas em
   `diary_entries`, como kcal e macros já fazem) ou somar por junção com
   `foods` pela quantidade da entrada. Registre a escolha e o custo em
   `docs/DECISIONS.md`. Entradas de OFF/USDA sem o dado e `user:quick-*`
   contam como "sem dado" — nunca como zero.

Tela — "Hoje", só com a chave ligada:

5. Depois da última refeição e dos chips dela, um filete `line` e o bloco:
   - linha `label` 13 `inkMuted`: **"8 dos 11 alimentos de hoje têm estes
     dados."** (o denominador conta itens, não porcentagem);
   - grade **2 colunas × 3 linhas** de `MacroBar` com `color={theme.colors.ink}`,
     célula de (328 − 12) / 2 = **158 dp**, altura 43 dp (18 rótulo + 18 valor
     + 4 + barra 3), gap 12: **Fibra · Cálcio · Ferro · Magnésio · Potássio ·
     Zinco**; valor no formato `8,4 de 14 mg` (fibra em g). **Sem percentual
     em lugar nenhum.** Célula sem nenhum contribuinte mostra "sem dado" à
     direita, trilho vazio, e ordena para o fim;
   - rótulo de seção `labelMedium` `inkMuted` **"Limites"** e, sob ele,
     **Sódio** numa linha de largura cheia, também em `ink` — a palavra faz o
     trabalho semântico que a cor não pode fazer;
   - rodapé `caption`: "As referências são valores diários gerais para
     adultos. O Bocado não avalia sua saúde."
   Referências (IDR, RDC 269/2005): cálcio 1.000 mg, ferro 14 mg, magnésio
   260 mg, potássio 3.510 mg, zinco 7 mg, sódio 2.000 mg, fibra 25 g.
6. Cor: `ink` em todas as barras, inclusive sódio. Nada de `accent` (seis
   barras índigo matam o acento único) e nada de `protein`/`carbs`/`fat`. As
   três barras do hero continuam dominantes: confira na captura, ao rolar, que
   a grade não vira o assunto da tela.
7. Opt-in: `SwitchRow` em Metas → Exibição, **"Minerais do dia"** (en-US
   "Minerals of the day"), padrão **desligado**. Com a chave desligada, a
   árvore de "Hoje" não contém o bloco.
8. A tela empurrada "Nutrientes" e a `ActionRow` propostas na pesquisa 05 §6
   **não entram**: a grade inline as substitui. Duas superfícies para o mesmo
   dado seria uma a mais. Ordem do fim de "Hoje": última refeição → chips dela
   → 8 dp → filete → grade → rodapé.
9. Vitaminas: nenhuma coluna, nenhuma célula, nenhum campo. O summary diz o
   porquê (cobertura 28,4 %).
10. Copy pt-BR e en-US; tema escuro pelos tokens. Testes de domínio: agregação
    do dia com entradas sem dado; mapeamento dos cinco ids USDA e das chaves
    OFF; migração 3 aplicada num banco na versão anterior sem perder entradas;
    importação do seed lendo `micro`. `README.md` deixa de listar
    micronutrientes como adiados.

Regras fixas valem, com a emenda que o dono fez em `regras.md` para esta
fase (cinco minerais, fibra e sódio no total do dia; vitaminas fora). Não faça
polish nesta tarefa: é tarefa de dado com uma tela.
