1. Tela de perfil acessível pelo app, com nome de exibição e @handle editáveis;
   salvar mostra confirmação, erro mostra mensagem específica.
2. Handle inválido (curto, maiúscula, símbolo) é barrado no cliente com mensagem
   por regra; handle em uso mostra erro claro e mantém o digitado.
3. Trocar o handle libera o antigo e reserva o novo atomicamente (testável: trocar
   e voltar para o antigo funciona).
4. Nenhuma tela do app exibe email como identidade: membros, convites, faixa do
   combinado e sheets mostram nome de exibição e/ou @handle.
5. Regras de segurança da coleção usernames versionadas no repo e listadas como
   passo manual do dono.
6. Teclado não cobre os campos; alvos ≥ 48px; tema claro/escuro; a11y nos campos.
7. `npm run validate` verde, incluindo testes novos da reserva de handle.
