Os macros de cada entrada do diário ficam em colunas alinhadas à direita, para
que a proteína de um alimento se compare com a do alimento de baixo num olhar.

Pedido do dono em 2026-09-10: "está ali P C G, só que só a letra e o número não
está muito bom. Eu quero comparar quantos gramas de proteína eu comi em cada
alimento que adicionei e comparar entre eles de uma forma mais fácil. Uma
tabela, ou pelo menos de uma forma mais bonita, ao lado das calorias."

Verificado no código: hoje a linha 2 da entrada é `100 g · P 3 · C 28 · G 0`
em Inter 13 `inkMuted`, dentro da caixa de 270 dp do nome, e o bloco de macros
começa **depois** da porção, cujo comprimento varia de 36,8 a 146,7 dp. As
letras P/C/G nascem em x diferentes a cada linha; nenhum tamanho de célula
conserta isso. As colunas só existem se o bloco for ancorado na margem
direita — a mesma regra que §1.2 já impõe ("números em coluna alinhados à
direita").

O diretor de design avaliou (2026-09-10) e o parecer está fechado: colunas
alinhadas, sem tabela nova e sem tela nova. As larguras abaixo foram medidas
nos TTFs de `assets/fonts` pelo mesmo método da pesquisa 06.

O que fazer, em `src/components/DiaryEntryRow.tsx` (vale para "Hoje", para a
`MealScreen` e para a bandeja, que reutiliza a linha):

1. `rowInner` vira coluna. **Linha 1 fica intacta:** `[nome 270][12][kcal 46]`.
   **Linha 2 passa a ocupar os 328 dp da linha**, não os 270 da caixa do nome:
   `[porção, flexShrink: 1][12][bloco de macros]`.
2. Bloco de macros **alinhado à direita**, com a borda direita no mesmo x em
   que termina a coluna de kcal. Célula = rótulo em caixa fixa de **10 dp** (o
   `G` mede 9,7) + **4 dp** + valor `tabular-nums` alinhado à direita em
   **26 dp** (três dígitos = 25,3) = **40 dp**; **8 dp** entre células; bloco =
   **136 dp**. `label` 13 `inkMuted`, `flexShrink: 0`.
3. Fora os `·` de dentro do bloco: vira `P   8    C  59    G   3` em coluna, não
   frase. O `·` continua só entre medida caseira e grama. Em pt-BR e en-US a
   chave `today.entryMacrosLine` deixa de ser frase e vira rótulos por célula
   (`P/C/G` e `P/C/F`); fibra continua fora.
4. Macro desconhecido (fonte sem o dado): a célula fica vazia **mantendo a
   largura**, para a coluna das outras linhas não andar. Registro rápido
   continua sem bloco nenhum.
5. Folga medida: a porção fica com 328 − 12 − 136 = **180 dp** a 1,0×;
   `1 colher de servir · 45 g` mede 146,7 e **para de truncar**. A 1,3× sobram
   139,2 dp e a colher trunca, como já trunca hoje.
6. Altura da entrada continua **64 dp**. A linha 1 não muda, então os 87,0 % de
   nomes inteiros da pesquisa 06 §3 não são tocados.
7. **Plano B**, só se a captura no J6 mostrar o `G 0` (13 `inkMuted`) sendo lido
   como segunda caloria logo abaixo do kcal (16 `ink`) na mesma borda: encerre
   o bloco em 270 dp (borda do nome) e aceite que a colher trunque a 1,0×. A
   decisão fica escrita com a captura que a motivou.
8. Recusas fechadas: cor por macro (ΔE00 3,0 entre `protein` e `fat`), terceira
   linha, macros na linha 1, controle de ordenar ou realçar por macro na
   `MealScreen` (é um controle, um estado persistido e um rótulo de
   acessibilidade novos para refeições de 1 a 6 itens), e tabela ou rodapé de
   total na `MealScreen` (as barras de §2.9 já são o total da refeição).
9. Acessibilidade inalterada: a entrada continua um nó só, com os três macros
   por extenso depois das calorias.
10. A tabela de larguras da pesquisa 06 §2 fica inválida (o denominador muda
    de 270 para 328): escreva `docs/research/07-macros-em-colunas.md` com a
    tabela refeita, as direções descartadas e o motivo de cada descarte;
    atualize `docs/DESIGN_SYSTEM.md` §2.5 e registre em `docs/DECISIONS.md`.
11. Ajuste `__tests__/entry-macros.test.ts` e `__tests__/today-screen.test.tsx`;
    teste novo para a regra de apresentação das células (largura fixa, célula
    vazia quando o macro é desconhecido, sem `·` dentro do bloco).

Regras fixas valem. Ponto fraco conhecido: o vão entre `100 g` e o bloco chega
a ~155 dp nas linhas de porção curta e cai a 12 dp nas de medida caseira —
ritmo diferente entre linhas da mesma refeição. É o que a captura decide.
