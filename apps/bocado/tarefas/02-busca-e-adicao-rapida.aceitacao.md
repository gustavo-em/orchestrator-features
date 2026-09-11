1. "Adicionar" do Almoço abre a busca em modal de tela cheia com o campo
   focado, teclado aberto, placeholder "Buscar alimento", cabeçalho com a
   refeição, e a seção "Sugestões" com seis alimentos, cada um com botão "+"
   (rótulo "Adicionar <nome>").
2. Digitar "arroz" lista "Arroz, tipo 1, cozido" em primeiro; a linha mostra a
   porção padrão com gramas e kcal, kcal/100 g e o badge TACO. Digitar "pao"
   lista "Pão, trigo, francês" em primeiro (busca sem acento).
3. Tocar "+" grava a entrada na hora: o botão vira "✓", a bandeja mostra
   "1 item · N kcal" e "Concluir"; tocar "✓" de novo não duplica.
4. "Concluir" (ou back) volta a "Hoje" com o item na refeição certa, subtotal
   da refeição e número-resposta atualizados; nada se perde ao sair pelo back.
5. Snackbar "<alimento> adicionado ao Almoço · Desfazer" por 4 s; "Desfazer"
   remove a entrada e reverte o "✓".
6. Sem resultado mostra "Nada para '<termo>'." com uma linha de ajuda; nunca
   lista vazia muda.
7. Tema claro e escuro; teclado nunca cobre a bandeja; lista com FlashList e
   item memoizado; busca local responde em < 100 ms (medição no summary).
8. Testes unitários: ranking ("arroz", "pao", "cafe com leite"), normalização
   sem acento, cálculo do snapshot da porção. `npm run validate` verde.

Nota de evidência (device): o snackbar dura 4 s e o dump da árvore leva ~3,5 s
neste aparelho. A prova de "Desfazer" vem dos passos base: `tapText "Desfazer"`
imediatamente após o "+", sem checkpoint entre eles, seguido de `tree
"apos-desfazer"` (linha volta a "Adicionar …" e a bandeja some). Um toque em
coordenada medida em captura anterior, ou depois de um checkpoint, cai fora da
janela e não é evidência de defeito.
