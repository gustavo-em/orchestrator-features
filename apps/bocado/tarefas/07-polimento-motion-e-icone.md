Polimento final de sensação premium sem mudar layout, cor, hierarquia ou copy:
aplicar o vocabulário único de motion (`src/theme/motion.ts`) em todo o app —
pressed 100 ms, chips 120 ms, "+" → "✓" 200 ms com escala, folhas 300/200 ms,
count-up 250–350 ms com `tabular-nums`, barras 400 ms, snackbar 150/100 ms,
stagger de 20 ms nas seis primeiras linhas de resultado, crossfade de 180 ms
na troca de dia; `ReduceMotion.System` em tudo e comportamento definido com
reduced motion. Só transform/opacity; nada de blur, sombra pesada ou Lottie.

Haptics via `react-native-haptic-feedback` com a tabela da spec (clockTick em
chips/stepper, click leve no "+", um sucesso por sessão no "Concluir"),
respeitando a preferência. Ícone adaptativo Android (foreground na safe zone,
background sólido, monocromático v33) e AppIcon iOS gerados por script Node
com `sharp` a partir do SVG mestre de `assets/brand/`; splash com o símbolo e
versão night; nome de launcher = nome da marca. Estados pressed em todo toque;
skeleton com a forma da linha na busca online; status/navigation bar nas
cores do tema; cold start ≤ 2,5 s no J6 (`am start -W`).

Decisões fechadas e evidência: `docs/specs/07-polimento-motion-e-icone.md`
(leia na fase de planejamento). Regras fixas valem.
