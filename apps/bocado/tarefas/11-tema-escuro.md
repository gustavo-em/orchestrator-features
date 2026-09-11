Deixar o tema escuro escolhível dentro do aplicativo. Os tokens escuros já
existem e o `ThemeProvider` segue o sistema; falta o controle e falta o lado
nativo, sem o qual a tela de abertura sai na cor errada em toda abertura fria.

Decisões fechadas em `docs/research/05-descoberta-ajustes-ui.md`, seção 4, com
medidas, nomes de arquivo e as duas correções de citação que a pesquisa faz
sobre o código atual. Leia na fase de planejamento.

1. CONTROLE — um `SegmentedControl` com Sistema, Claro e Escuro na seção
   "Preferências" de Metas, logo acima da vibração, com chaves de tradução
   próprias nos dois idiomas. O componente nunca usa acento, então a regra de
   um acento por tela continua intacta.
2. PERSISTÊNCIA — espelho exato do que o idioma já faz: tipo de configuração
   em `colors.ts`, chave e leitores em `prefs.ts` usando o helper `readOneOf`,
   e o `ThemeProvider` guardando a escolha, derivando o modo e publicando o
   contexto. MMKV é síncrono, então o primeiro quadro já sai na cor certa e
   nada da navegação é remontado.
3. NATIVO, NA MESMA ENTREGA — um módulo Kotlin novo que grava a escolha e
   chama `setDefaultNightMode`, lido em `MainApplication.onCreate` antes de
   carregar o React. É isso que faz a tela de abertura e os recursos noturnos
   resolverem pela escolha. Mais o ajuste da barra de navegação para a troca ao
   vivo. A barra de status não precisa de linha nova.

Se o módulo nativo não aparecer em tempo de execução, o invólucro vira uma
operação vazia e silenciosa, e você relata isso no summary em vez de bloquear
a tarefa: o resto da funcionalidade continua de pé sem ele.

O aparelho de teste tem o modo noturno do sistema travado pela One UI, então a
verificação da tarefa é justamente escolher "Escuro" dentro do aplicativo —
pela primeira vez o tema escuro poderá ser visto numa captura.

Regras fixas valem.
