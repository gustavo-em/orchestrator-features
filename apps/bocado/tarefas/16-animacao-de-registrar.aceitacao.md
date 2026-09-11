1. Registrar um alimento mostra a entrada chegando na lista com movimento, e
   uma sequência de capturas no J6 prova o antes e o depois.
2. O botão de salvar da folha de porção confirma com animação no próprio
   botão. A captura mostra o estado de confirmação.
3. Se um verde entrou, ele existe só no botão: uma captura do painel do dia na
   mesma sessão mostra hero, barras e entradas sem verde nenhum.
4. A entrada continua sendo escrita no toque: o snackbar de desfazer aparece
   no mesmo instante de sempre, sem esperar animação.
5. Com "reduzir movimento" ligado, não há percurso e a confirmação continua
   visível.
6. Nenhuma duração ou curva escrita fora de `src/theme/motion.ts`, provado por
   grep.
7. Se Lottie entrou: o peso do APK e o tempo de abertura no J6 medidos antes e
   depois, no summary. Se não entrou, a tarefa diz por que Reanimated bastou.
8. A vibração continua disparando uma vez por registro.
9. `npm run validate` verde.

## O ✓ e a chegada saem do laço: são vídeo, não captura

O testador de tela tira quadros com `screencap`, e cada quadro custa mais tempo
do que a animação inteira dura (o ✓ vive ~200 ms, a chegada ~260 ms). Nenhuma
sequência de capturas vai pegá-los de forma confiável: isso é limitação do
método de coleta, não defeito do aplicativo, e já custou dois ciclos.

**Não continue perseguindo esses dois quadros.** O dono grava a interação com
`adb shell screenrecord` e extrai os quadros do vídeo, que é a ferramenta certa
para animação curta, e o resultado entra em `docs/specs/16-animacao.md`.

O que o laço fecha, e que já está fechado nas coletas deste ciclo:

- a escrita no toque, com o total da refeição subindo o valor exato;
- nenhum verde em botão, hero, barras, subtotal ou entradas;
- nenhuma dependência nova e nenhuma duração fora de `src/theme/motion.ts`;
- a guarda de reentrância: um toque duplo grava uma entrada e vibra uma vez.

Se esses quatro estão provados, a tarefa passa. O ✓ e a chegada são meus.

### Ciclo 5: feche com o que existe

O toast de desenvolvimento do React Native ("Open debugger to view warnings.",
por volta de `[20,1239][700,1334]`) cobre o botão de confirmar `[32,1256][688,1352]`
e come o toque. Ele é artefato da build de debug: não existe em release e não
é defeito do aplicativo. Já custou dois ciclos.

Para esta tarefa, portanto:

- **O toque de confirmar não precisa de prova de tela.** O caminho de escrita
  já está provado por outra rota, na coleta do ciclo 3: MealScreen 1.167 kcal →
  folha do "Café com leite" → 1.198 kcal, +31 exatos, com os macros batendo.
  Isso fecha o critério 4.
- **O ✓ e a chegada da linha são meus, em vídeo**, como já está escrito acima.
- Se a coleta conseguir dispensar o toast antes de mirar no rodapé, ótimo; se
  não conseguir, **não trate como achado** e não gaste o ciclo nisso.

Feche a tarefa com os quatro pontos que o laço prova e liste em "não
verificado" o que ficou para o vídeo. Um `FAIL` por causa do toast seria um
falso negativo, e este é o último ciclo.
