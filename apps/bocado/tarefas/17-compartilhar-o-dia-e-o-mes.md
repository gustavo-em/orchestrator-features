Compartilhar o que comeu, como imagem e como texto.

Pedido do dono em 2026-09-09, em três peças: um PNG do dia, um texto resumido
do dia, e — se der — um PNG do mês inteiro, tipo calendário, com os macros de
cada dia bem resumidos. O destino que ele citou é WhatsApp e ChatGPT.

Esta é a primeira feature do aplicativo que **produz alguma coisa para fora**.
Duas consequências que precisam estar decididas antes de desenhar:

- **Nada de conta, nada de servidor.** A imagem é gerada no aparelho e entregue
  ao seletor de compartilhamento do Android. O aplicativo não sobe nada.
- **A imagem é a marca andando por aí.** Ela não é um print da tela com a barra
  de status e a barra de navegação dentro: é uma peça desenhada, com a marca,
  legível quando o WhatsApp comprime. Decida a proporção pensando em onde ela
  vai parar.

O que a tarefa entrega:

1. IMAGEM DO DIA — um PNG com a data, o total de kcal, os três macros e a lista
   do que foi comido por refeição. Desenhado, não capturado. Nos dois temas, ou
   sempre no claro se a pesquisa concluir que o claro sobrevive melhor à
   compressão — decida e escreva o porquê.
2. TEXTO DO DIA — a mesma informação em texto puro, curto, colável no WhatsApp
   ou num chat de IA. Sem emoji decorativo, sem tabela ASCII que quebra no
   celular.
3. IMAGEM DO MÊS — uma grade de mês, um quadrado por dia, com os macros
   resumidos. Aqui o risco é virar borrão: se a pesquisa mostrar que os três
   macros por dia não se leem nesse tamanho, reduza o que cada dia mostra e
   diga por quê. Grade que não se lê não vai para o produto.
4. ONDE FICA — o gatilho não polui "Hoje". A pesquisa de UX escolhe o lugar e
   justifica.

Riscos nomeados, para não descobrir no aparelho:

- Capturar uma `View` em PNG no J6 com pouca memória: meça o tempo e o pico de
  memória, e se a peça não couber, gere-a em duas partes.
- O aplicativo não pede permissão de armazenamento para compartilhar: use o
  cache do próprio aplicativo e o `FileProvider` que o Android exige.
- Se entrar dependência nova para capturar ou compartilhar, ela é justificada
  com peso e alternativa considerada.

Regras fixas valem. Cor, tipografia e espaçamento da peça saem dos tokens.

## Rótulos fixos, porque a coleta depende deles

Os passos de ADB desta tarefa tocam por texto. Use exatamente estes rótulos
visíveis (ou de acessibilidade, quando o alvo for só um ícone), para a coleta
achar o caminho sem adivinhar:

- o gatilho: **Compartilhar**
- as três saídas: **Imagem do dia**, **Texto do dia**, **Imagem do mês**

Se a pesquisa de UX concluir que outro nome comunica melhor, troque — mas
troque também `apps/bocado/adb/17-compartilhar-o-dia-e-o-mes.json` no mesmo
ciclo, senão a coleta bate numa tela que não existe e o achado vira ruído.
