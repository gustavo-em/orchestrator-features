1. Depois de ligar "Minerais do dia" em Metas → Exibição, "Hoje" rolado até o
   fim mostra a grade 2 × 3 (Fibra, Cálcio, Ferro, Magnésio, Potássio, Zinco)
   e a linha de Sódio sob "Limites" — captura e árvore.
2. Com a chave desligada (padrão de instalação nova), a árvore de "Hoje" não
   contém a grade nem o rodapé.
3. Com pelo menos um alimento da TACO registrado, ao menos cinco células
   mostram valor no formato "x de y mg" (fibra em g); o caractere "%" não
   aparece em lugar nenhum da tela.
4. A linha de cobertura ("N dos M alimentos de hoje têm estes dados.") está
   presente, com N e M coerentes com as entradas do dia.
5. Uma célula sem contribuinte mostra "sem dado" com trilho vazio — provado
   com um registro rápido como única entrada do dia.
6. Nenhuma barra do bloco usa `accent` nem as cores de macro (revisão do
   código e captura).
7. A folha de porção não ganhou controle novo: sua árvore é a mesma de antes
   da tarefa.
8. Teste de migração: um banco na versão anterior chega à nova sem perder
   `diary_entries`; `SCHEMA_VERSION` igual a `MIGRATIONS.length`.
9. Tamanho de `assets/data/foods.seed.json` antes e depois, no summary, com
   aumento de no máximo 10 %.
10. `docs/DECISIONS.md` registra a recusa do disclosure por alimento (com a
    alternativa: tela de detalhe do alimento, aberta da busca, depois de um
    mês de uso), a escolha snapshot × junção, e a substituição da tela
    "Nutrientes" pela grade; `docs/DESIGN_SYSTEM.md` ganha a anatomia da
    grade; `README.md` atualizado.
11. `npm run validate` verde.

## Diagnóstico do dono, 2026-09-10 04:40

O gate `tela` falhou quatro ciclos seguidos com `tapText: "Metas" não
encontrado na tela atual`, e o motivo não é o código desta tarefa. A grade e a
chave existem e foram vistas no aparelho: a tela Metas traz `Minerais do dia`
com o subtítulo "Uma grade no fim do dia, com o que a base mede." e o
`content-desc` "Mostrar no diário". O gate `codigo` já havia passado.

A falha era o roteiro `adb/20-minerais-do-dia.json`. Ele buscava `arroz` e
depois tocava `Arroz, tipo 1, cozido` como passo opcional. A busca por `arroz`
devolve `Arroz integral`, `Arroz, integral, cru`, `Arroz, tipo 1, cru`,
`Arroz, tipo 2, cozido`, `Arroz, tipo 2, cru`, `Arroz-doce` e `Arrozina` —
`Arroz, tipo 1, cozido` fica abaixo da dobra, e o dump do uiautomator só
contém nós renderizados. O toque opcional não casava, a folha de busca ficava
aberta, os dois passos opcionais seguintes também não casavam e o
`tapText "Metas"`, não opcional, falhava porque o app não estava em "Hoje".
Só `hoje-sem-chave.png` foi capturado em cada ciclo — nenhuma evidência da
grade chegou aos gates.

Corrigido no roteiro: a busca virou `arroz tipo 1 cozido` (o alvo passa a ser
o primeiro resultado, confirmado no aparelho), a espera seguinte subiu para
2500 ms, e os toques em `Arroz, tipo 1, cozido`, `Adicionar ·` e `Concluir`
deixaram de ser opcionais, para que uma futura divergência de rótulo falhe no
passo certo em vez de derrubar um passo posterior.

Rótulos conferidos no aparelho, para quem for editar o roteiro: a folha de
porção confirma com `Adicionar · 58 kcal`; depois dela vem uma bandeja com
`Concluir` e `1 item · 58 kcal`; só então "Hoje" tem `Metas`. Não existe
"Concluir" na folha de porção — ele aparece um passo depois.

Lição que vale para as próximas tarefas: desde a tarefa 18 não há mais nenhum
texto visível "Adicionar" na tela "Hoje"; o anel expõe "Adicionar em <refeição>"
apenas em `content-desc`. O `findNodeByText` casa `content-desc`, então
`tapText "Adicionar"` continua funcionando — mas um passo que dependa de texto
visível não.
