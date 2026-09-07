1. Os 5 tokens do lightTheme com os valores exatos do brief; accent/onAccent/
   accentInk e o darkTheme byte a byte como antes.
2. Screenshots das abas (Tarefas, Projetos, Você) e da sessão de foco com a
   paleta nova: fundo neutro levemente quente, sem leitura de "papel amarelado";
   o acento #FFC63D visivelmente mais protagonista que antes.
3. Chip de filtro selecionado identificável por borda de acento + peso do texto
   (evidência em screenshot dos três chips, um selecionado); não selecionados
   com fill card.
4. Texto de apoio (muted) legível: contraste ≥ 4.5:1 sobre background e card.
5. Tema escuro sem nenhuma alteração (screenshot de uma tela no escuro igual ao
   estado anterior).
6. Nenhuma mudança de layout/estrutura; divergência de cor contra os PNGs de
   docs/design/refs/ não é achado nesta tarefa.
7. `npm run validate` verde (incluindo o teste de brand, atualizado se ele fixa
   os hex antigos).
