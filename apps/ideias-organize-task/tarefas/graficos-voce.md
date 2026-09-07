Repensar os gráficos da tela Você: métricas que importam, apresentação criativa,
animação de entrada. Palavras do dono: "ninguém se importa com o nível que você
está no app".

Decisões fechadas:

- REBAIXAR o nível: deixa de ser destaque; pode sumir ou virar detalhe discreto
  — decisão de design, mas nunca mais o protagonista.
- MÉTRICAS QUE ENTRAM (protagonistas): tarefas abertas vs. fechadas (o pedido
  explícito do dono), fechadas nos últimos 7 dias (o gráfico semanal existente
  pode evoluir), e o que mais o domínio já tem de honesto e útil (ex.: melhor
  dia da semana, projetos ativos). Só métricas que os dados locais sustentam —
  nada inventado, nada que exija backend.
- SEJA CRIATIVO NA FORMA, sóbrio na execução: use $design-director. Barras,
  anéis de progresso, sparkline — o que comunicar melhor cada métrica; paleta
  pelos tokens (acento como destaque único por gráfico; nada de arco-íris);
  números com fonte tabular; sem biblioteca de chart pesada nova se SVG/View
  resolver.
- ANIMAÇÃO DE ENTRADA: os gráficos animam ao abrir a aba (barras crescendo,
  anel preenchendo, contagem subindo) com os presets de motion existentes,
  300-600ms, uma vez por visita à aba; reduced motion mostra o estado final.
- O placar continua LOCAL: nada disso sincroniza nem aparece para outros
  membros (regra fixa do combinado).
- Copy nos dois idiomas; tema claro/escuro.
