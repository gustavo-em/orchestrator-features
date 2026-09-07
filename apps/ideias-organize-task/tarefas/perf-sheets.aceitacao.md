1. Baseline registrado (renders e tempo de abertura por sheet) antes de qualquer
   mudança, e a mesma medição depois — com melhora demonstrada nos números.
2. Cada correção aplicada cita a medição que a motivou; nada de otimização sem
   evidência.
3. Abertura dos sheets sem trabalho síncrono pesado no onPress; animação via
   native driver/reanimated.
4. Nenhuma mudança visual ou de comportamento nos sheets (mesmos elementos,
   mesma ordem, mesmas ações).
5. Instrumentação temporária removida ou atrás de __DEV__.
6. `npm run validate` verde.
