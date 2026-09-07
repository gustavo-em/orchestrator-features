Lote de pequenos ajustes relatados pelo dono usando o app. Cada item é pequeno;
corrija na raiz quando houver componente compartilhado, sem expandir escopo.

BUGS (prioridade):

1. Editar tarefa (tocar numa tarefa existente): o botão Salvar não aparece mais
   na folha de edição. Regressão provável da simplificação em camadas — a edição
   abre expandida e precisa do Salvar sempre visível.
2. Botão "levar para hoje" na tarefa dentro do projeto (tela de Projetos) não faz
   nada. Ligar a ação real (levar a tarefa para o dia) com feedback visual.
3. Folha de nova tarefa flutuando: há um espaço entre o teclado e a folha aberta.
   Corrigir o keyboard avoiding para a folha assentar rente ao teclado.
4. Chips/fichas de filtro dentro da folha de adicionar tarefa estão quebrando
   para a linha de baixo. Devem caber em uma linha (ajuste de largura/scroll
   horizontal/compactação — decidir pelo padrão do design system).

COMPORTAMENTO:

5. App inicia SEMPRE em tema claro (padrão = claro, não seguir o sistema); a
   opção de mudar em Aparência continua funcionando e persiste a escolha do
   usuário depois que ele mudar manualmente.
6. Nova tarefa nasce com a data de HOJE selecionada (em vez de sem data). A
   ficha de data já aparece resolvida como "hoje"; o usuário pode trocar/limpar.

VISUAL:

7. Espaço vertical exagerado entre o card "Você está em dia" e a linha de
   filtros na tela Tarefas — reduzir para o passo normal do spacing scale.
8. Remover o cabeçalho de data da tela Tarefas (interpretação do dono: "o dia dá
   pra ver pelo próprio celular"). Se o cabeçalho carregar outra função além da
   data, preservar a função e remover só a data.
9. Tarefas dentro do projeto expandido: os cards pequenos não dão a sensação de
   estarem DENTRO do projeto. Melhorar o pertencimento visual respeitando a
   regra fixa "nada de card dentro de card": indentação, filete, espaçamento ou
   continuidade visual — não uma caixa nova.
10. Compartilhar projeto está escondido atrás do menu de 3 pontinhos
    (interpretação do dono, frase cortada): expor a ação de compartilhar
    diretamente no projeto (ícone visível no card/tela do projeto), mantendo o
    menu como caminho secundário.

Regras fixas valem em tudo; copy nova (se houver) nos dois idiomas.

DIREÇÃO TÉCNICA para o item 3 (folha × teclado), após 4 ciclos de KAV sem fechar
o vão (~148px constante entre folha e teclado):

- PRIMEIRO diagnostique, não tente outra variação de KAV às cegas:
  a) confira `android:windowSoftInputMode` no AndroidManifest da MainActivity —
     com `adjustPan` (ou ausente), KeyboardAvoidingView não funciona no Android;
     `adjustResize` é pré-requisito;
  b) com adjustResize + edge-to-edge, o vão constante costuma ser inset
     compensado em dobro (KAV + safe area/insets do sheet) — meça: 148px ≈ qual
     inset do device?
- Caminho determinístico autorizado se KAV continuar falhando: remover KAV do
  sheet e usar o listener de teclado (Keyboard/useAnimatedKeyboard) aplicando
  translateY/paddingBottom exato da altura do teclado ao container da folha.
  Trocar a estratégia NÃO é redesenho; é a correção esperada.
- Critério inalterado: folha rente ao topo do teclado, sem faixa de fundo
  visível entre eles, com evidência keyboard:true.
