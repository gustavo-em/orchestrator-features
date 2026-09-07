Critérios observáveis na tela ou no comportamento do app, sem depender de analytics:

1. App deslogado abre na tela de login; app com sessão salva abre direto na tela principal,
   inclusive após force-stop e reabertura.
2. Login com credencial válida navega para a tela principal em um passo, com loading visível
   durante a espera (botão desabilitado ou spinner, nunca tela congelada).
3. Credencial inválida mostra mensagem específica perto do formulário, sem limpar os campos
   digitados e sem culpar o usuário.
4. Sem rede, o erro diz que é problema de conexão e oferece tentar de novo; não mostra erro
   genérico nem trava em loading infinito.
5. Cadastro valida email malformado e senha curta antes de chamar o Firebase, com mensagem
   por campo.
6. Recuperação de senha confirma o envio do email e volta para o login.
7. Logout em ajustes/perfil volta para a tela de login e uma nova abertura do app continua
   deslogada.
8. As tarefas locais criadas antes do login continuam visíveis depois de entrar.
9. Teclado não cobre o campo em foco; campos têm autofill hints e o fluxo funciona só com
   teclado/talkback (labels de acessibilidade nos campos e botões).
10. Telas novas respeitam tema claro e escuro e contraste WCAG AA; alvos de toque ≥ 44pt.
