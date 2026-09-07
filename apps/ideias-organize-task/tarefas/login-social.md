Ampliar a autenticação existente (email/senha via Firebase Auth, já em produção no
código) com três entradas novas:

- Login com Google: Android e iOS.
- Login com Apple: somente iOS (obrigatório pela App Store quando há login social).
- Login anônimo: só pede um nome de exibição; sem email e sem senha. Deixar claro na
  tela que a conta anônima vive só naquele aparelho até ser vinculada.

Decisões fechadas:

- Firebase Auth para os três provedores (Google, Apple, Anonymous já habilitados ou
  habilitáveis no console pelo dono — se um provedor não estiver habilitado, siga
  implementando e liste a habilitação como passo manual do dono, sem bloquear).
- Conta anônima pode ser promovida depois (link com Google/Apple/email) sem perder
  dados — use linkWithCredential; não implemente a UI de promoção nesta tarefa, só
  não a inviabilize.
- A tela de login existente ganha os botões sociais seguindo o design system do app
  (nada de botões coloridos fora do tema, exceto as exigências de marca do Google e
  da Apple para seus botões oficiais).
- Módulos nativos novos exigem rebuild — o driver já faz; declare os pods/gradle
  necessários e rode o install.
- Testes de tela no emulador Android: Google Sign-In em emulador sem Play Services
  pode não completar — o fluxo até a intent abrir é o verificável; o retorno
  autenticado vira observação "não verificável em emulador" se o Play Services
  faltar. Login anônimo é 100% verificável.
- iOS: implemente o código (Apple/Google) mas a validação de tela é só Android
  nesta esteira; registre o que ficou para teste manual no simulador iOS.
