Discovery (SEM implementar): como simplificar a folha de adicionar tarefa. Opinião
fundamentada + alternativa concreta; a decisão fica com o dono.

Relato do dono:

> "O modal de adicionar tarefa pode ter muitas coisas na tela — para uma pessoa
> mais simples e leiga é muita informação. Talvez as opções possam ser
> expandíveis, ou outra forma de colocar."

O que a análise precisa cobrir (use $produto, mobile-design e $design-director):

- Inventário do que a folha mostra HOJE no primeiro contato (campo, fichas de
  data/prioridade/projeto, texto de ajuda das fichas, linha de sintaxe aceita,
  botões) — conte os elementos e classifique cada um: essencial para capturar,
  ou avançado/opcional.
- O trabalho do usuário leigo: capturar um pensamento em segundos sem decidir
  nada. Toda decisão visível na frente dele (prioridade? projeto? sintaxe?) é
  custo — a captura mínima é só texto + salvar.
- Mercado: como os melhores resolvem captura rápida vs. detalhe (Todoist quick
  add com parsing invisível, Things com detalhes atrás de toque, TickTick).
  Padrão de progressive disclosure: o que fica na frente, o que expande.
- A linha de sintaxe ("amanhã, sexta 9h, urgente, ~30min, #projeto"): poder de
  usuário avançado exposto a todo mundo. Avaliar: esconder atrás de "?" ou de
  primeira-vez, manter o parsing funcionando silencioso.
- ALTERNATIVA CONCRETA (entrega principal): a folha reorganizada descrita em
  camadas — o que o leigo vê (mínimo), o que um toque em "mais opções" revela,
  e o que continua automático por sintaxe para quem sabe. Wireframe textual
  elemento por elemento, reusando os componentes existentes (fichas, SheetActions).
- Regras fixas valem (linguagem sem culpa, nada de card em card); prevenção de
  erro atual (Salvar desabilitado vazio) preservada.
- Custo, risco e o menor passo reversível (ex.: só recolher fichas + ajuda atrás
  de um expansor, sem mexer no parser).

Entregável: o brief (run plan-only). Nenhum arquivo muda.
