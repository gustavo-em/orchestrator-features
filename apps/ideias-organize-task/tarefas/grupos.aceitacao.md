Critérios observáveis na tela ou no comportamento do app:

0. GABARITO VISUAL (bloqueante): cada tela implementada corresponde exatamente à
   sua referência em `docs/design/refs/` — linha do projeto = 6d, ShareSheet
   completa = 6e, ShareSheet sem link/erro/leitor = 6f. Abra a imagem (Read) e o
   screenshot lado a lado; só PASS com correspondência exata de geometria, ordem,
   cores e tipografia. Divergência = CHANGES_REQUIRED nomeando imagem e diferença.

1. A implementação segue `docs/design/projeto-compartilhado.md` (fase 1) e a UI segue
   `docs/design/ui-projeto-compartilhado.md`: tamanhos, espaços, cantos e cores vêm do
   theme (nenhum número solto), nada abaixo de `type.caption`, texto sobre Sol usa
   `onAccent`.
2. Usuário logado cria projeto compartilhado com nome e o vê na aba Projetos com
   indicação visual de que é compartilhado.
3. O convite descrito na spec funciona de ponta a ponta: gerar, copiar/compartilhar e
   entrar; convite inválido mostra erro claro sem travar o fluxo.
4. Membros aparecem conforme a spec (lista/stack), com o dono identificado; papéis e
   permissões se comportam exatamente como a especificação define.
5. Tarefa criada por um membro aparece para os demais após atualização/reabertura da
   tela; conclusão mostra quem concluiu.
6. Projeto sem tarefas mostra estado vazio de grupo (com convite em destaque quando só
   há um membro), distinto do estado "tudo concluído".
7. Sair do projeto remove-o da lista de quem saiu e o mantém para os demais; excluir
   (permissão conforme a spec) pede confirmação explicitando que afeta todos.
8. Sem rede, ações de grupo mostram erro de conexão com opção de tentar de novo; nada de
   loading infinito nem crash.
9. Alvos de toque ≥ 48px (com `hitSlop` quando o desenho é menor), contraste WCAG AA,
   labels de acessibilidade nos controles de convite, membros e conclusão, tema claro e
   escuro.
10. Nenhum dado de outro usuário aparece para quem não é membro do projeto.
