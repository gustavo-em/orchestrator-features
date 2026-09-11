1. Como membro editor (não dono) de um espaço compartilhado, a folha de
   edição de tarefa mostra a lista de pessoas do espaço com alternância por
   pessoa — evidência de tela e árvore com os testIDs
   `task-assign-<personId>`.
2. O atalho "Entrar na tarefa" continua disponível e funcionando.
3. Viewer não vê alternância nenhuma, nem para si mesmo.
4. Teste de domínio com a matriz completa: dono/editor/viewer × si/terceiro.
5. `docs/firebase/firestore.rules` atualizado permitindo editor escrever
   `assignments` de qualquer membro e recusando viewer e não-membro; o passo
   de publicação está no summary como manual.
6. Espaço não compartilhado continua sem a seção de pessoas.
7. Documentação do modelo antigo atualizada, com a data e o motivo da
   mudança.
8. Copy pt-BR e en-US, a11y, tema claro/escuro, `npm run validate` verde.
