1. Ícone adaptativo novo aparece na home do Android após instalar (screenshot
   da home com o app) e a splash mostra o símbolo sobre a cor da marca ao
   abrir (checkpoint imediato após o launch), inclusive em tema escuro.
2. Fluxo Adicionar → "+" → "Concluir" sem regressão de layout; "✓" com fundo
   de destaque; bandeja e snackbar presentes; número-resposta atualizado.
3. Tema escuro em "Hoje", busca e folha de porção sem contraste abaixo de AA.
4. Nenhum valor de duração/easing solto fora de `src/theme/motion.ts` (`rg`
   por `duration:` e `withTiming(` fora do vocabulário no summary); reduced
   motion documentado e testado por unidade onde houver lógica.
5. Haptics só pelo helper único; nenhum `Vibration.vibrate`.
6. `adb shell am start -W` reporta `TotalTime` ≤ 2.500 ms (observação do
   tester ou medição do lead no summary).
7. Listas com FlashList e `estimatedItemSize`; nenhum `console.log` em
   produção. `npm run validate` verde.
