1. App instala e aparece como "Aluza" no launcher, com o ícone do símbolo em
   fundo claro (screenshot do launcher); adaptive icon correto em pelo menos
   uma densidade verificada.
2. Splash animada com a logo do kit ao abrir (sequência de screenshots), sem
   atraso perceptível do startup; reduced motion = logo estática.
3. Nome novo da feature compartilhada decidido com racional registrado
   (produto+marketing) e aplicado em toda a interface; grep não encontra
   "Projeto(s)" remanescente na copy da feature (exceto onde a palavra for
   genuinamente genérica).
4. Paridade pt-BR/en-US da copy nova; teste de paridade verde.
5. Frames do onboarding regenerados mostrando o nome/marca novos.
6. applicationId: trocado para app.aluza SE o google-services.json novo existia;
   caso contrário, inalterado e a pendência listada no summary — build verde
   nos dois cenários.
7. Nenhuma violação das regras fixas; tema claro/escuro; `npm run validate`
   verde.
