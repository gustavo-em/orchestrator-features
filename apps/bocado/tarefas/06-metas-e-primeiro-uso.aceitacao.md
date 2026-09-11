1. Com o app limpo, a abertura mostra "O que você quer?" com os três botões;
   "Perder peso" avança para os dados com padrões preenchidos (30 anos,
   170 cm, 70 kg) e os quatro chips de atividade.
2. "Calcular" mostra "Sua meta: N kcal" coerente com Mifflin-St Jeor. Com os
   padrões (30 anos, 170 cm, 70 kg, sedentário, perder peso) a aritmética é:
   mulher 1.451,5 de taxa basal × 1,2 = 1.741,8, menos 500 = **1.240 kcal**,
   acima do piso de 1.200 e portanto sem aviso; homem 1.617,5 × 1,2 = 1.941,
   menos 500 = 1.441, abaixo do piso masculino e portanto **1.500 kcal com
   aviso de piso**. O número é editável no lugar e as três metas de macro
   aparecem.
3. "Começar" leva a "Hoje" com o número-resposta igual à meta; reabrir o app
   não mostra o primeiro uso de novo.
4. "Pular" em qualquer tela leva a "Hoje" com 2.000 kcal e "Metas" mostra a
   nota de meta padrão.
5. "Metas" mostra meta e macros com %, "Recalcular" reabre os dados
   preenchidos, e a alternância restantes/consumidas muda o número de "Hoje".
6. Idioma "English" troca toda a interface para en-US (inclusive nomes das
   refeições); "Sistema" volta ao pt-BR do device.
7. Textos fixos exatos: "Perder peso", "Manter", "Ganhar massa", "Calcular",
   "Pular", "Começar", "Recalcular". Testes unitários da fórmula e dos pisos;
   `npm run validate` verde.
