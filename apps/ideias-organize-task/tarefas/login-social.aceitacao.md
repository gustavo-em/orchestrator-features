1. Tela de login mostra: email/senha (como hoje), botão Google, botão Apple (só
   iOS — no Android ele não aparece nem ocupa espaço), e "Continuar só com nome".
2. Login anônimo: pede apenas nome de exibição, valida vazio, entra direto na tela
   principal; o nome aparece onde o app mostra o usuário; aviso claro de conta
   local ao aparelho.
3. Botões sociais seguem as diretrizes de marca (Google/Apple) e o restante da
   tela segue o design system do app; alvos ≥ 48px; labels de acessibilidade.
4. Fluxo Google no Android: toque abre o fluxo do provedor; com Play Services
   ausente no emulador, o app mostra erro tratado (não crasha) — retorno
   autenticado pode ficar como observação não verificável.
5. Erros de cada provedor têm mensagem própria em pt-BR/en-US, sem culpar o
   usuário; cancelamento pelo usuário não mostra erro nenhum.
6. Sessão persiste por provedor (reabrir o app mantém logado), logout funciona
   para os três tipos.
7. Conta anônima não quebra os fluxos existentes de projetos compartilhados
   (identidade = uid anônimo + nome de exibição).
8. Nenhuma regressão no login email/senha existente; `npm run validate` verde.
