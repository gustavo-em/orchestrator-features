Registrar um alimento tem de ser gostoso de fazer.

Pedido do dono em 2026-09-09: uma animação no item entrando na refeição, e/ou
no botão de salvar — ele sugeriu o botão virar verde e tocar uma animação
Lottie ali dentro.

Duas coisas antes de começar, porque a sugestão do dono esbarra em decisões
que já estão no repositório:

- **Verde é proibido no painel do dia** (`docs/DECISIONS.md` §7): verde e
  vermelho estão reservados para não julgar quem usa. O botão de salvar não é
  o painel do dia, então um verde de confirmação **pode** existir, mas ele não
  pode vazar para o hero, para as barras de macro nem para as entradas. Decida
  isto explicitamente na fase de design e escreva a decisão.
- **Lottie é uma dependência nova** num aparelho de 2 GB, e a regra da casa é
  que o J6 é o juiz. Meça: se a mesma sensação sai de Reanimated, que já está
  no projeto, não entre com Lottie. Se entrar, justifique com o peso do APK e
  o tempo de abertura medidos antes e depois.

O que a tarefa entrega:

1. O ITEM ENTRANDO — a entrada nova na lista da refeição chega com um
   movimento próprio, não aparece de estalo. Só `transform` e `opacity`.
2. O BOTÃO DE SALVAR — o botão primário da folha de porção confirma o registro
   com uma animação no próprio botão, com ou sem a virada de cor, conforme a
   decisão do item acima.
3. A animação nunca atrasa o registro: a entrada é escrita no toque, como já é
   hoje (decisão 5), e a animação é a consequência, não a condição.
4. "Reduzir movimento" corta o percurso e mantém uma confirmação estática.
5. O retorno tátil que já existe continua uma vez só, sem virar duas.

Regras fixas valem. Durações e curvas saem de `src/theme/motion.ts`; se
faltar uma, ela é acrescentada lá e em lugar nenhum mais.
