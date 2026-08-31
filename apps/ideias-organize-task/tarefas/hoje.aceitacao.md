"Menos medo de abrir o app" só é auditável se virar coisa observável na tela. Os critérios
abaixo são o que o ux_auditor deve conseguir julgar num screenshot:

1. A primeira dobra não comunica dívida acumulada. Nada de contagem de atrasadas em destaque,
   badge com número alto, nem vermelho como cor dominante da tela.
2. O primeiro elemento visível é acionável e pequeno: no máximo três itens antes de um
   respiro visual claro. O resto entra por rolagem, não por parede.
3. Existe um estado explícito de "você está em dia", diferente do estado de lista vazia por
   não ter nada cadastrado. Os dois precisam parecer coisas distintas.
4. Nenhum texto atribui falha ao usuário. Sem "você não concluiu", "pendências acumuladas",
   "atrasado há N dias" como manchete.
5. Vermelho fica reservado para ação destrutiva. Atraso, se aparecer, usa hierarquia
   tipográfica ou peso, não alarme cromático.
6. Um único foco por tela. Todo o resto recua em contraste, tamanho ou posição.
7. Contraste de texto atende WCAG AA e todo alvo de toque tem pelo menos 44pt.
8. A abertura não mostra tela branca ou spinner longo: se houver carregamento, é esqueleto
   com a forma do conteúdo.
9. A mudança respeita reduced motion e funciona em tema claro e escuro.
10. Nada do que foi decidido depende de dado que o app ainda não tem.
