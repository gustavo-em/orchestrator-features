O cabeçalho de cada refeição ganha um subtotal em coluna e o "+" em anel no
lugar do texto "Adicionar" em acento.

Pedido do dono em 2026-09-10, depois de usar o app no aparelho:

1. "A fonte do número de calorias está um pouco estranha, porque ela não está
   assim em todos os lugares."
2. "O botão azul de adicionar é o único contraste do app inteiro. A palavra
   Adicionar do lado do café da manhã está legal, mas tente deixar esse botão
   com algum estilo diferente, que transpareça elegância — geralmente preto
   com branco ou branco com preto. Se não combinar com a proposta do app,
   pode recusar."

O diretor de design já avaliou os dois pedidos (2026-09-10) e o parecer está
fechado; não reabra:

- **Família tipográfica não muda.** A decisão 11 fica: Fraunces só onde há uma
  resposta por tela (hero do dia, quantidade da folha, total da tela da
  refeição); kcal de entrada, busca, chips e bandeja seguem Inter tabular. O
  que o dono lê como "fonte estranha" é outra coisa: o subtotal do cabeçalho
  ("301") e a kcal da entrada ("300") têm desenho idêntico a 90 dp de
  distância, e o subtotal flutua no eixo x porque vem depois de um nome de
  largura variável (`marginLeft: spacing.md` após um `flexShrink: 1`). Falta
  hierarquia e falta coluna.
- **O problema do botão não é o azul, é a repetição.** Quatro acentos
  idênticos numa tela destroem a raridade que faz o índigo funcionar. A saída
  é o anel "+" em tinta, não pílula, não botão preenchido, não texto preto.

O que fazer:

1. Em `src/components/MealHeader.tsx`, o subtotal passa de `body` (Inter
   Regular 16) para **`bodyMedium`** (Inter Medium 16), `tabular-nums`, `ink`,
   sem unidade. É o tratamento que a bandeja já dá a uma soma. O nome da
   refeição vira `flex: 1`; o subtotal vira **coluna fixa de 46 dp com
   `textAlign: 'right'`** — a mesma largura de `KCAL_WIDTH` em
   `DiaryEntryRow.tsx`. Os quatro subtotais passam a formar coluna entre si, e
   com a coluna de kcal das entradas.
2. O `TextButton` "Adicionar" do cabeçalho vira o **anel "+" de §2.4 do design
   system**: alvo 48 × 48 dp, anel visual 36 dp, borda 1,5 dp em `inkSubtle`,
   ícone `plus` 24 dp em `ink`. Cabeçalho com `paddingLeft: 16` e
   `paddingRight: 8`, igual à linha de resultado. O `accessibilityLabel`
   continua **"Adicionar em {refeição}"** — o tester navega por ele. O mesmo
   anel entra no `trailing` do `ScreenHeader` da `MealScreen` (`meal-add`).
3. O anel do cabeçalho **nunca preenche em acento e nunca vira "✓"**: na busca
   o anel é por alimento e confirma; no cabeçalho é por refeição e abre a
   busca. Escreva isso em §2.4 e §2.6, senão alguém "conserta" a diferença.
4. Recusas fechadas, não implemente: pílula contornada (nasce igual aos chips
   de sugestão 8 dp abaixo, no mesmo bloco); texto "Adicionar" em `ink` (§2.2
   reserva tinta para navegação, e a ação sumiria dentro do cabeçalho); quatro
   botões preenchidos em `ink`/`inverseSurface` (gritam mais que o hero).
5. A regra do acento é reescrita em `docs/DESIGN_SYSTEM.md` §0.3 e §1.1:
   **o acento marca fazer; uma tela pode ter zero papéis de ação.** Em "Hoje"
   o acento fica só no papel de estado (barra e ponto de hoje); o acento de
   ação continua no "+"→"✓" da busca, no `PrimaryButton` da folha e no
   "Concluir" da bandeja. §2.6 deixa de dizer "mesmo tratamento das kcal de
   uma entrada" e passa a dizer "mesma família e mesmo corpo, um peso acima,
   porque é soma". `docs/DECISIONS.md` ganha a decisão 12 com este porquê.
6. `displaySmall` (Fraunces 24) é código morto em `src/theme/type.ts`: remova,
   ou marque reservado com a razão. Não volte a usá-lo.
7. Estado vazio: com o anel, o convite ao lado de "Nada registrado ainda" fica
   só no glifo. Confira numa captura de um dia sem registros. Se ficar fraco,
   a linha vazia inteira vira alvo que abre a busca (mesma ação do anel) — não
   traga o texto de volta numa refeição e não na outra.
8. Tema escuro conferido nos tokens: `inkSubtle` sobre `background` ≥ 3:1
   (classe não-texto) e `plus` em `ink`. Não há evidência de tela do escuro
   neste aparelho; vale a regra fixa.

Regras fixas valem. `regras.md` já diz que o texto "Adicionar" pode viver no
rótulo de acessibilidade. Efeito colateral esperado: o anel devolve ~97 dp de
largura ao cabeçalho e sua borda direita cai a 2 dp da coluna de kcal das
entradas — a margem direita da tela vira uma coluna só.
