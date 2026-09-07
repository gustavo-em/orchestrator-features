Implementar projetos compartilhados com amigos na aba Projetos.

A especificação aprovada está no próprio repositório do app e é a fonte de verdade:

- `docs/design/projeto-compartilhado.md` — domínio, fases, papéis, portas e casos de uso.
- `docs/design/ui-projeto-compartilhado.md` — UI: tokens do theme, componentes, arquivos e
  código no estilo do repositório.

Leia as duas antes de planejar. Trate as decisões delas como aprovadas pelo dono do app:
não reabra, não simplifique os papéis definidos, não troque a direção visual nem os
tokens. Implemente a fase 1 descrita na especificação; fases seguintes só se a própria
spec mandar.

Depende do login com Firebase já implementado e mergeado; a identidade do membro é a
conta autenticada. Se o login não existir no código, pare com BLOCKED dizendo isso.

APROVAÇÃO VISUAL OBRIGATÓRIA: as imagens em `docs/design/refs/` são o gabarito
exato desta feature — `6d-linha-do-projeto.png`, `6e-sharesheet-compartilhado.png`
e `6f-sharesheet-sem-link-erro-leitor.png`. Tester e auditor devem ABRIR essas
imagens (Read) e comparar lado a lado com os screenshots do device: geometria,
ordem dos elementos, tipografia, cores, espaçamentos e o que aparece para cada
papel. A feature só é aprovada com as telas exatamente conforme o gabarito;
qualquer divergência é CHANGES_REQUIRED citando a referência e o screenshot.

Se algo na especificação for impossível dentro deste ciclo (serviço ausente, credencial,
contradição com o workspace), registre em blockers em vez de contornar ou improvisar
outra direção.
