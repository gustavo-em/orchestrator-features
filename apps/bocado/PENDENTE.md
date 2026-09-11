# Onde a fila do Bocado parou — 2026-09-10 08:05

O dono precisou do aparelho para outro projeto, então a fila foi interrompida no
meio dos ciclos de verificação da tarefa 21. Nada foi perdido; nada além do
listado aqui está pendente.

## Como retomar

A tarefa 21 estava em ciclo de verificação, sem alteração nova de código. Para
continuar de onde parou:

```bash
cd ~/Documents/orquestrador-features
RESUME_STATE=runs/2026-09-10T09-55-28.944Z-zq7hgl.json ./apps/bocado/run-queue.sh 21
```

A fila exige árvore limpa. O trabalho da 21 já está comitado como
`51af12c wip: 21-nomes-em-ingles (gates unfinished)`, então a árvore está limpa
— mas o commit `wip` continua no histórico até a 21 fechar de verdade e gerar o
`feat:`. Se preferir que o agente refaça a tarefa do zero a partir do brief,
rode sem `RESUME_STATE`.

Depois da 21 a fila segue sozinha para a 22, que já está na lista.

## Estado de cada tarefa

| Tarefa | Situação |
| --- | --- |
| 18 · Cabeçalho da refeição | fechada, `d9cd7bc` |
| 19 · Macros em colunas | fechada, `d143586` |
| 20 · Minerais do dia | fechada, `7ce4aa3` |
| 21 · Nomes em inglês | código pronto e conferido à mão; gate `tela` sem assinar; `51af12c wip:` |
| 22 · Medidas caseiras em inglês | brief, aceitação, roteiro adb e linha na fila escritos; nunca rodou |

## O que falta, em ordem

1. Terminar os gates da tarefa 21 com o comando acima.
2. Rodar o dry-run do roteiro da 22 contra o aparelho antes de deixar um agente
   gastar ciclo nele. O `validateAdbSteps` já passou (49 passos), mas o roteiro
   nunca tocou o aparelho — e nas tarefas 20 e 21 foi exatamente isso que
   custou três ciclos. O jeito de rodar está descrito na seção "Sobre o roteiro
   adb desta tarefa" em `tarefas/22-medidas-caseiras-em-ingles.aceitacao.md`:
   instanciar `AndroidTestDriver` com o pacote, o device e os passos, chamar
   `runStep` em laço e imprimir o índice que estourar.
3. Rodar a 22.

## Coisas do ambiente que mudaram e que talvez você queira desfazer

- `app.json` aponta para o Galaxy M53 (`RXCTA0A54XA`). O original, com o J6
  (`52000796031fc56d`), está em `app.json.bak`. Medição de performance feita no
  M53 não vale para o J6: arm64, Android 14, muito mais rápido.
- O Metro do projeto `ideias-organize-task` foi encerrado para liberar a porta
  8081. Ele não volta sozinho; reinicie quando precisar daquele projeto.
- O build do Bocado deixou de ser 32-bit (`01aca50`): agora sai com
  `armeabi-v7a` e `arm64-v8a`. Para voltar ao build só-J6, use
  `RN_ABIS=armeabi-v7a npm run android:test-build`.
- O dia 10 no aparelho tem três entradas repetidas de `Rice, type 1, cooked` de
  58 kcal, sobra dos dry-runs. Com `deviceState: "manter"` elas ficam e não
  afetam os gates, mas explicam a contagem se alguém comparar com uma captura
  antiga.
- Dois commits `wip:` estão no histórico — `4cdbf37` (trabalho parcial da 18,
  que depois shipou em `d9cd7bc`) e `51af12c` (a 21). Dá para fazer squash
  quando a 21 fechar.

## Achado ainda em aberto, sem tarefa

Os seis rótulos de medida que o glossário não cobre vêm do Open Food Facts e não
são medidas: `sadia`, `geladinho gulozitos`, `se a medida de 10g de bacon`,
`nó`, `coió` e `folded`. A tarefa 22 os deixa passar de propósito, exibidos como
estão. Se algum dia incomodarem, o lugar é o filtro de rótulo em
`scripts/build-food-seed.mjs:348`, não o glossário.
