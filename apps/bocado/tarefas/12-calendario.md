Escolher qualquer dia num calendário, sem sujar a tela principal.

Decisões fechadas em `docs/research/05-descoberta-ajustes-ui.md`, seção 3, com
a conta de largura do cabeçalho, a anatomia da folha em medidas exatas e o
motivo de cada recusa. Leia na fase de planejamento.

1. GATILHO — o título de "Hoje" vira o botão, com um glifo de calendário de
   20 dp ao lado. Nada de aba, nada de segundo botão no cabeçalho. As props
   novas entram no `ScreenHeader`, que é componente canônico, e não como
   remendo local na tela.
2. O TÍTULO PERDE O DIA DA SEMANA — `formatDayTitle` deixa de imprimir "ter,".
   É essa metade que faz a conta fechar: com o dia da semana, qualquer forma de
   gatilho trunca antes do compromisso de fonte grande do design system. O
   leitor de tela continua ouvindo a data por extenso, e a faixa logo abaixo já
   mostra o dia da semana.
3. FOLHA DE MÊS — rota nova, grade de seis linhas por sete colunas sempre, mês
   navegável com as setas, rodapé com atalho para hoje. Toca num dia, seleciona
   e fecha; sem botão de confirmar. Medidas, alinhamento da grade e o cálculo
   do que fica visível atrás da folha estão na pesquisa; siga-os.
4. SEM BIBLIOTECA — a aritmética de calendário são umas trinta linhas em
   `src/domain/diary/days.ts` mais dois formatadores. `react-native-calendars`
   traz um segundo motor de lista e o lodash inteiro; está descartada.
5. SEM MARCAÇÃO POR DIA — não pinte pontinho nos dias com registro. É barato no
   banco e errado no produto: grade com buracos é grade de aderência, e o
   design system proíbe.

Atenção ao risco que a pesquisa nomeia: a abertura da folha usa
`initialScrollIndex` num pager horizontal, que é exatamente a classe de defeito
que deixou a faixa de dias vazia. Se a folha abrir em branco no aparelho, é
aqui. O intervalo de meses é o mesmo que a tela já impõe hoje.

Regras fixas valem.
