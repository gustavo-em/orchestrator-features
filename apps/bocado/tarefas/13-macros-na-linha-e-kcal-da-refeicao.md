Ver proteína e carboidrato sem abrir o item, e o subtotal da refeição parecer
uma caloria.

Dois pedidos do dono, feitos em 2026-09-09 depois de usar o aplicativo.

1. MACROS NA LINHA — o dono não quer tocar no item para saber quanto de
   proteína e carboidrato ele tem. Os números voltam para a linha da entrada,
   em "Hoje" e na tela da refeição, **sem a linha ficar grande**.

   Isto **reverte** a decisão 9 de `docs/DECISIONS.md` e a §1 da pesquisa
   `docs/research/05-descoberta-ajustes-ui.md`, que tiraram os macros da linha.
   A decisão do dono vale; o que a pesquisa mediu continua valendo como
   restrição, e é por isso que a forma anterior não serve:

   - A terceira linha `P 1,9 g · C 21 g · G 0,2 g` foi tirada porque levou a
     entrada de 64 dp para 72 dp e comeu uma entrada inteira de tela no J6.
     Não a traga de volta como está.
   - Pôr os três à direita, ao lado das kcal, derrubou de 87% para 44% os
     nomes de alimento que cabem inteiros em 360 dp. Medido, não achado.

   Então a tarefa é de **descoberta primeiro**: com as skills de UX, ache uma
   forma que caiba na entrada de 64 dp existente e não roube largura do nome.
   Explore pelo menos estas direções antes de escolher, e registre por que
   descartou as outras:

   - abreviação forte de uma linha só na segunda linha, junto da porção
     (`100 g · P 8 · C 59 · G 3`), sem repetir a unidade em cada macro;
   - só os dois que o dono citou (proteína e carboidrato) na linha, com a
     gordura ficando no toque;
   - barra ou marca gráfica compacta em vez de número, com o número no
     rótulo de acessibilidade.

   Restrições que não mudam: entrada de 64 dp, kcal na coluna fixa de 46 dp à
   direita, nada de cor para codificar macro (reprova em daltonismo, medido),
   e o rótulo de acessibilidade continua dizendo os três por extenso.

2. O NÚMERO EMBAIXO DE "ADICIONAR" NÃO PARECE CALORIA — no cabeçalho de cada
   refeição, o subtotal (`meal-<refeição>-subtotal`) é desenhado numa fonte
   que não é a mesma das kcal das entradas e do hero, então não se lê como
   caloria. Uniformize: o subtotal usa o mesmo tratamento tipográfico de kcal
   que o resto do aplicativo, ou ganha a mesma unidade visível que as outras
   kcal têm. Uma coisa ou outra, não as duas.

Regras fixas valem. Nada de mexer em paleta, espaçamento ou motion.
