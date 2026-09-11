1. "Metas" mostra, em Preferências, um seletor com Sistema, Claro e Escuro,
   com o valor atual marcado e alvo de 48 dp.
2. Escolher "Escuro" muda a interface na hora, sem reabrir o aplicativo: a
   captura de "Hoje" sai com fundo escuro, tinta clara e o acento `#93A0F2`.
   Esta é a primeira evidência de tema escuro do projeto, já que o aparelho
   trava o modo noturno do sistema.
3. Escolher "Claro" volta ao papel quente. Escolher "Sistema" volta a seguir o
   aparelho.
4. A escolha sobrevive a fechar e reabrir o aplicativo, e o primeiro quadro já
   sai na cor certa, sem piscar claro antes.
5. Numa abertura fria com "Escuro" escolhido, a tela de abertura sai escura, e
   não em papel osso. Se o módulo nativo não estiver disponível, o summary diz
   isso explicitamente e os itens 1 a 4 continuam valendo.
6. Contraste AA em todo texto legível nas duas aparências, e nenhuma tela lendo
   cor fora dos tokens.
7. `npm run validate` verde, com dois testes novos: a escolha vence o sistema, e
   a escolha sobrevive à remontagem. O arquivo de testes reinicia a preferência
   entre casos, porque o substituto do MMKV persiste dentro do mesmo arquivo.
