Dois problemas na faixa "Hoje, no combinado" dentro do projeto compartilhado —
um bug e um problema de clareza. Relato do dono, com internet ligada:

> "aparece 'Hoje, no combinado' mas eu não entendi nada do que é. E sempre aparece
> 'Sem conexão agora — mostrando o que já estava no aparelho' mesmo com internet."

1. BUG — aviso de offline permanente (prioridade):

- Reproduza com internet ligada e investigue a CAUSA REAL antes de corrigir.
  Suspeitos, nesta ordem: erro de servidor/permissão sendo tratado como
  "offline" (até hoje as regras de users/usernames devolviam 403 — o dono acabou
  de publicá-las; reteste primeiro); detecção de conectividade inexistente ou
  mal lida; estado inicial "offline" que nunca é limpo após o primeiro pull bem
  sucedido.
- A faixa precisa distinguir três estados e nunca confundi-los: (a) sem rede de
  verdade → aviso de conexão; (b) erro do servidor/permissão → mensagem de erro
  própria com tentar de novo; (c) dado carregado → nenhum aviso.
- Critério duro: com internet e regras publicadas, o aviso de offline NÃO pode
  aparecer.

2. CLAREZA — o usuário não entende o que é o combinado:

- Primeiro contato com a faixa precisa se explicar sozinho. No estado vazio,
  além do título, uma linha curta do conceito no tom das regras (ex.: cada um
  leva poucas tarefas para o dia; aqui vocês veem o combinado uns dos outros) e
  o botão existente como próxima ação.
- Trabalhe DENTRO do layout do gabarito (docs/design/refs/6c): melhorar
  microcopy e o estado vazio, não redesenhar a faixa. Se concluir que clareza
  exige divergir do gabarito, use requiresRedesign com a proposta em vez de
  improvisar.
- Copy nova nos dois idiomas com paridade.
