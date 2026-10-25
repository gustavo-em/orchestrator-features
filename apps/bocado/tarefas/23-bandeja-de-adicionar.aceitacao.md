# Aceitação — 23 · Bandeja de adicionar

1. Depois de tocar "+" numa linha da busca, nada na tela sugere que a entrada
   ainda precisa ser confirmada. Provado pela captura `busca-apos-adicionar`
   e pela árvore: nenhum controle cujo texto ou rótulo seja um verbo de
   confirmar ou concluir.
2. O usuário continua vendo o que foi adicionado na sessão e quantas kcal isso
   somou, onde a decisão tiver colocado esse resumo.
3. Fechar a busca, por qualquer caminho, mantém as entradas: a captura
   `hoje-apos-fechar` mostra a banana no café da manhã.
4. "Desfazer" e editar/remover itens da sessão continuam funcionando — provado
   por teste e por uma captura.
5. `docs/DECISIONS.md` registra a opção escolhida, as descartadas e o motivo de
   cada descarte, incluindo a posição do dono de preferir continuar na busca.
   `docs/DESIGN_SYSTEM.md` §2.10 descreve a anatomia nova.
6. Os 15 roteiros adb que tocavam "Concluir" foram atualizados e os passos
   obrigatórios das tarefas 20 e 21 continuam passando.
7. Nenhuma mudança no momento em que a entrada é gravada.
8. `npm run validate` verde.

## Sobre o roteiro adb desta tarefa

O roteiro base não toca em "Concluir" nem em nada que a decisão possa remover:
adiciona uma banana e captura a busca logo depois, e o diário depois de voltar.
Ele serve qualquer uma das opções. Se a opção escolhida precisar de mais
evidência, peça passos novos.

Armadilhas já conhecidas deste driver (tarefas 20 e 21), mantenha evitadas:
passo do caminho principal é obrigatório; `tapText` só vê nó renderizado; um
`tapText` igual ao texto digitado num campo acerta o campo; com
`deviceState: "manter"`, o que o roteiro muda ele desfaz.

## Diagnóstico do dono, 2026-09-11 10:00

Os três ciclos de tela falharam com `tapText: "Adicionar em Café da manhã"
não encontrado` e o motivo não é o código desta tarefa — o gate `codigo`
passou. O aparelho mostrava a tela vermelha do React Native em debug:
`'RNBackgroundFetch' could not be found`. Esse módulo nem existe no Bocado.

Havia um Metro de **outro projeto** na porta 8081, e o `installDebug` do build
religa `adb reverse tcp:8081` a cada ciclo. O Bocado de debug pedia o
JavaScript à 8081, recebia o bundle do outro app e morria antes de desenhar
qualquer tela. Conferido: sem o `reverse`, o mesmo APK abre no diário com o
anel "Adicionar em Café da manhã" na tela.

Corrigido no projeto (`6b0c101`): `npm run android:test-build` remove o
`adb reverse` depois de instalar, então o Bocado de teste usa o bundle que o
próprio script embutiu no APK. **Não mate nem mexa no Metro da 8081** — ele é
do dono, que está usando outro projeto no mesmo aparelho.

Se a tela vermelha voltar a aparecer com um nome de módulo que o Bocado não
tem, a causa é esta mesma: confira `adb reverse --list` antes de suspeitar do
código.

## Correção do diagnóstico, 2026-09-11 10:30

O conserto descrito acima (`6b0c101`, remover o `adb reverse` depois do
`installDebug`) não é o estado final. O próprio ciclo desta tarefa trocou o
`android:test-build` para `installRelease`, que não usa Metro e resolve a mesma
causa pela raiz; uma restauração posterior da limpeza do `reverse` era
redundante e foi desfeita. A regra que vale está em `regras.md`, na seção
"Build de teste e a porta 8081".
