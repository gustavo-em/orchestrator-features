Decisões de design já fechadas para o Ideias. Valem em toda tarefa.

## Contexto do dono e arquitetura (decida sozinho por isto)

- O dono é **desenvolvedor solo**, sem equipe e sem backend próprio. Nunca proponha
  serviço customizado, servidor, ou infra que exija time.
- Backend é **Firebase e só Firebase**: Auth para identidade, **Firestore para dados
  compartilhados** (banco já provisionado no console pelo dono). Precisou de dado entre
  usuários? A resposta é Firestore — não pergunte, não bloqueie por "falta backend".
- Quando um passo só o dono pode executar no console (publicar regras de segurança,
  habilitar provedor, criar índice): **implemente tudo mesmo assim**, versione a
  configuração no repositório (ex.: `docs/firebase/firestore.rules`) e liste o passo
  manual do dono no summary — nunca stub falso, nunca BLOCKED por isso.
- Validação que exige duas contas simultâneas: verifique com um login + conta
  descartável o que der; o resto vira observação "não verificável com um device",
  nunca FAIL nem BLOCKED.
- Custo importa: prefira o desenho mais simples que fecha o trabalho do usuário
  (last-write-wins, sem tempo real, sem papéis complexos), como as specs em `docs/`
  já definem.

## Separadores de seção

Cabeçalho de seção usa rótulo curto em maiúsculas, contagem ao lado e um filete fino
horizontal que atravessa o resto da largura. O filete fica, e é ele que agrupa a seção.

Não trocar o filete por espaçador invisível. Não é barra de progresso: é régua tipográfica,
o mesmo recurso de sumário editorial e de cabeçalho de tabela. Se o filete parecer pesado,
baixe a opacidade ou a espessura — não remova.

## Nada de card dentro de card

Item de tarefa já é um card com fundo e borda. A seção que contém esses itens não pode ter
fundo, borda ou raio próprios. Seção se delimita por cabeçalho, filete e espaço em branco.

Quando bater a vontade de "agrupar melhor", a resposta é espaçamento, não outra caixa.

## Cor

`theme.colors.danger` é exclusivo de ação destrutiva. Hoje isso significa **um único lugar**:
o botão Excluir, em `ConfirmDialog.tsx`.

Em `TaskFacts.tsx` existem dois usos de `danger`, e **os dois são violações a corrigir**:

- `priorityColor`, vindo de `toneOf[facts.priority.tone]` — pinta o glifo `≡` de vermelho em
  tarefa de prioridade alta.
- `dueColor`, quando `facts.due?.late` — pinta a data de vermelho em tarefa atrasada.

Nenhum dos dois é ação destrutiva. Prioridade alta não é perigo e atraso não é perigo; os dois
precisam de outro tratamento — peso tipográfico, forma do glifo, ou uma cor de destaque
não-alarmante do design system. O mesmo vale para o uso equivalente em `ListsScreen.tsx`.

Esta regra manda **tirar** vermelho, nunca manda preservar. Não escreva em
`implementationConstraints` nem em `outOfScope` nada que mantenha esses usos como estão, e não
justifique preservá-los alegando semântica diferente: a semântica é justamente o problema.
Se um achado apontar vermelho fora do Excluir, o achado está certo.

## Linguagem

Nenhum texto atribui falha ao usuário. Sem "você não concluiu", sem "atrasado há N dias" como
manchete, sem tom de cobrança em estado vazio.

## Estado do aparelho de teste (fato, não decisão)

O Android de teste é um Samsung SM-M536B, Android 14, 1080x2400. Em
2026-09-10 ele foi preparado à mão, e as tarefas contam com esse estado
(`--device-state manter`; `limpo` apaga tudo isto):

- conta de convidado com o nome **Gustavo** (o login por nome levou 3 s, sem
  travar);
- espaço compartilhado **Casa**, com link de convite ativo;
- grupo **Festa** dentro de Casa, com a tarefa **Comprar bolo**.

As três abas ficam em y = 2256: Tarefas em x = 180, Espaços em x = 540, Você
em x = 900. Toque na aba por coordenada, não por texto: dentro de um espaço o
botão de voltar se chama "Voltar para os espaços" e disputa o mesmo texto.

O driver ganhou o passo `deeplink` em 2026-09-10 para estas tarefas: ele
entrega um `android.intent.action.VIEW` direto ao componente do app, que é o
que chega quando alguém toca no link do convite.

Validação com duas contas continua impossível num device só; o que precisa de
duas pessoas vira teste automatizado mais observação, nunca FAIL.
