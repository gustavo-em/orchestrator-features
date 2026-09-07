Implementar a recomendação aprovada pelo dono na análise de foco (brief do run
2026-09-01T16-32-40, decisão: aprovada integralmente):

- Remover o destino "Foco" da barra inferior: 4 abas viram 3 (Tarefas, Projetos,
  Você).
- O foco passa a iniciar PELA TAREFA, na aba Tarefas: ação de "focar" na própria
  tarefa (onde a UX decidir: no card ou no detalhe).
- Estado "focando" inline: o card da tarefa em foco mostra o tempo correndo e um
  tratamento visual claro de "em foco" (design system, sem alarme).
- Tocar no card em foco abre a sessão imersiva — a FocusScreen atual fica
  INTACTA como tela da sessão; só deixa de ser aba.
- Estados a cobrir: focando (tempo correndo), pausado, terminado (retorno à
  lista com a tarefa marcável), e reentrada na sessão imersiva.
- Passo reversível como o brief definiu: só a lista de abas e o card mudam;
  nenhuma remoção de código da FocusScreen.
- Cuidado de integração: a tarefa telas-botoes-2 centralizou o componente de aba
  — a barra com 3 abas herda o componente corrigido.
- Copy nova (rótulos/estados) nos dois idiomas.
