1. Captura de "Hoje" com as quatro refeições: os quatro subtotais terminam na
   mesma coordenada x (medida nos `bounds` da árvore, não relatada), e essa
   coordenada é a mesma da coluna de kcal das entradas.
2. O subtotal do cabeçalho está em Inter Medium 16 tabular e a kcal da entrada
   em Inter Regular 16; uma captura mostra os dois na mesma tela.
3. Nenhum cabeçalho tem texto "Adicionar" em acento; os quatro têm o anel "+"
   com `content-desc` "Adicionar em <refeição>", e o passo `tapText
   "Adicionar"` continua abrindo a busca (o roteiro adb prova).
4. O alvo do anel mede pelo menos 48 × 48 dp na árvore.
5. Em "Hoje", o acento aparece só em papel de estado; nenhum botão de refeição
   usa `accent`.
6. Captura de um dia sem registros com o estado vazio e o anel; a decisão
   sobre a linha vazia (alvo ou não) está registrada.
7. `docs/DESIGN_SYSTEM.md` §0.3, §1.1, §2.4 e §2.6 e `docs/DECISIONS.md`
   (decisão 12) atualizados; `displaySmall` removido ou marcado reservado.
8. Teste unitário: `MealHeader` renderiza o anel com o rótulo de
   acessibilidade e sem texto de acento; o teste de tokens cobre o contraste
   de `inkSubtle` no tema escuro.
9. `npm run validate` verde.

## O aparelho que julga mudou

Da tarefa 18 em diante o juiz é um **Galaxy M53** (Android 14, 1080 × 2400 a
450 dpi, ou seja **384 dp** de largura, arm64), e não mais o J6. A decisão do
dono está registrada em `docs/DECISIONS.md` §8.

Duas consequências para a coleta e para os achados:

1. **As contas de largura continuam em 360 dp.** A coluna de 46 dp para kcal,
   o corte do rótulo de medida caseira e a célula do calendário foram medidos
   em 360. Aqui sobram 24 dp, então o que couber neste aparelho pode não caber
   no anterior: ao medir, diga a largura em dp e não trate 384 como o piso.
2. **O que era invisível no J6 agora é verificável**, e vale capturar quando a
   tarefa tocar nisso: a abertura pela SplashScreen API do Android 12+
   (`values-v31`) e o "Tema · Sistema" seguindo o modo noturno do aparelho,
   que o J6 mantinha travado em claro.

Não trate diferença de desempenho como prova: este aparelho é rápido demais
para reprovar as proibições que existem por causa de um aparelho de 2 GB.
