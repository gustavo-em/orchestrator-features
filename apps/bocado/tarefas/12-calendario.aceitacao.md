1. O título de "Hoje" é tocável, tem um glifo de calendário ao lado e abre a
   folha de mês. O rótulo de acessibilidade diz a data por extenso e a dica diz
   que serve para escolher outro dia.
2. O título não imprime mais o dia da semana: um dia anterior aparece como
   "8 de set", e a faixa logo abaixo continua mostrando "ter".
3. A folha abre já no mês do dia selecionado, na primeira captura, sem rolagem
   e sem tela em branco. A grade tem sempre seis linhas, e os dias de meses
   vizinhos ficam vazios.
4. Tocar num dia fecha a folha e "Hoje" passa a mostrar aquele dia, com o
   diário e o resumo correspondentes. As setas mudam de mês e ficam
   desabilitadas nas pontas do intervalo.
5. Dia futuro além do fim da semana atual não é selecionável.
6. O atalho do rodapé volta para hoje.
7. Nenhuma dependência nova no `package.json`.
8. `npm run validate` verde, com testes da aritmética de mês: a grade de 42
   posições começando na segunda, a virada de mês e o intervalo permitido.

## Estado do aparelho na coleta

A tarefa 11 deixou o aparelho com o tema **Escuro** gravado no MMKV, e a fila
roda com `device: manter`. Antes de capturar qualquer tela desta tarefa, a
coleta abre Metas > Preferências > Tema e toca em **Sistema**, voltando à
paleta papel. O J6 trava o modo noturno do sistema em claro, então "Sistema"
rende o tema claro — que é a paleta canônica em que a pesquisa mediu a folha de
mês e a conta de largura do cabeçalho. Capturar o calendário no escuro não é
defeito, mas compara com números que não são os da pesquisa.

## O critério 3 vale duas vezes, e a segunda é a que importa

A folha é um pager horizontal com `initialScrollIndex` — a classe de defeito
que deixou a faixa de dias vazia na tarefa 09. A implementação inverte a lista
para que o mês de hoje seja o índice 0, então abrir a folha com hoje
selecionado **não exerce** o seek: essa captura não prova nada sobre o risco.

A coleta precisa das duas:

1. Abrir a folha com hoje selecionado (índice 0) — grade preenchida.
2. Escolher um dia de **três meses atrás ou mais**, deixar a folha fechar, e
   **reabrir** a folha. Agora `initialScrollIndex` é 3 ou mais e o J6 tem de
   pintar aquela página no primeiro quadro. Capturar essa reabertura sem tocar
   na tela antes. Grade em branco, mês errado no título ou setas desabilitadas
   fora das pontas nessa captura são defeito, não falha de coleta.

## 9. Defeito aberto e reproduzido: a faixa não segue o dia escolhido

Reproduzido no J6 em 2026-09-09 10:32 sobre o diff do ciclo 3. Diagnóstico
completo, com a árvore de UI e a causa, em
`docs/specs/12-calendario-faixa-desencontrada.md`. **Leia antes de implementar.**

Escolher **8 de setembro** não exerce este caminho: o dia 8 já está na semana
visível. É preciso escolher um dia de outra semana.

Escolhendo 15 de junho pela folha, o título, o hero e as refeições vão para 15
de junho, mas a faixa mostra 16–22 de setembro, sem chip selecionado, e chama
16 de setembro de "segunda-feira" quando é quarta. Causa: `scrollToWeek` pede
`scrollToIndex` da página 12 de uma lista horizontal que nunca a mediu — a
mesma classe da spec 09 §1.

Critério: depois de escolher 15 de junho, e **sem tocar na tela outra vez**, a
faixa mostra seg 15 … dom 21 de junho com o 15 marcado, e cada `content-desc`
nomeia o dia da semana correto da sua data. Consertar o sintoma com um
`scrollToIndex` adiado, um `setTimeout` ou um `onLayout` que re-rola não fecha
este critério: a página certa tem de sair no primeiro quadro.
