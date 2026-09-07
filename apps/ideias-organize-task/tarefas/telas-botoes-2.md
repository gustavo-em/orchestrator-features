Correção visual cirúrgica: componentes de ícone + rótulo estão com o ícone
alinhado à ESQUERDA da coluna em vez de centralizado na horizontal sobre o texto.
Relato do dono com screenshot, três ocorrências confirmadas:

1. Barra inferior de navegação (Tarefas, Projetos, Foco, Você): o ícone de cada
   aba fica encostado à esquerda; deve ficar centralizado horizontalmente sobre o
   rótulo.
2. Botão de nova tarefa: o "+" fica acima do texto mas alinhado à esquerda; deve
   centralizar.
3. Botões/chips de filtro (prazo, projeto, prioridade): mesmo defeito.

Causa provável: containers em coluna sem alignItems: center (default flex-start).
Corrija na RAIZ: o componente compartilhado de item ícone-sobre-rótulo (ou crie
um, se cada lugar tem o seu) passa a centralizar; os três lugares consomem dele.
Regra permanente: todo componente ícone+rótulo em coluna centraliza o eixo
horizontal.

Verificação objetiva: na árvore de UI, o centro-x do bounds do ícone deve
coincidir com o centro-x do bounds do rótulo (tolerância de ~4px) em cada um dos
três lugares.

Fora do escopo: qualquer outra mudança visual, cor, tamanho ou reordenação.
