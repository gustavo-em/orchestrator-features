Melhorar o fluxo de criação e entrada de projetos — dois ajustes do dono na tela
de Projetos:

1. DECIDIR "COMPARTILHADO" NA CRIAÇÃO: na folha de novo projeto, além de
   nome/cor/símbolo, um seletor claro "Projeto compartilhado" (toggle ou duas
   opções). Marcado, o projeto já nasce compartilhado: cria o documento no
   Firestore, gera o link de convite e, ao salvar, mostra o convite pronto para
   copiar/compartilhar (reusando a ShareSheet/estado de convite existente) — sem
   o passo atual de criar local e só depois compartilhar pelo menu.
   - Sem conexão ao salvar como compartilhado: erro tratado com opção de criar
     local e compartilhar depois — nunca perder o que o usuário digitou.
   - Desmarcado (padrão): comportamento atual, projeto local.
2. ENTRAR COM CONVITE MAIS VISÍVEL: posicionar o botão "Entrar com convite"
   como ação secundária ACIMA do botão de novo projeto, sempre visível na tela
   de Projetos (hoje existe mas não está evidente o suficiente para quem recebe
   um convite). Estilo secundário do design system (sem competir com a ação
   primária), alvo ≥ 48dp, mesmo JoinInviteSheet de destino.

Regras fixas valem; copy nos dois idiomas; nenhuma outra mudança na tela.
