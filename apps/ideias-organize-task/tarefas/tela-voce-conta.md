Reorganizar a aba Você: a conta vem primeiro, e editar perfil vira TELA, não
modal.

- ORDEM: o bloco de conta (foto/iniciais, nome de exibição, @handle) passa a
  ser o PRIMEIRO elemento da aba Você, acima de progresso/gráficos/ajustes.
- EDITAR PERFIL: tocar em "Editar" (ou na própria linha de conta) navega para
  uma TELA separada de edição — navegação push com voltar, não a folha/modal
  atual. A tela contém: foto (com troca, se a tarefa de foto já entregou),
  nome de exibição, @handle, e as validações existentes (unicidade, formato).
  Salvar confirma e volta; erro mantém o digitado.
- A folha/modal antiga de perfil é removida do fluxo (sem código morto).
- O restante da aba (gráficos novos, sequência, ajustes, sair) mantém o
  conteúdo, apenas reordenado abaixo da conta.
- Padrões: top bar contextual do app (rótulo maiúsculo + filete) na tela nova;
  teclado não cobre campos; regras fixas; a11y; copy pt-BR/en-US.
