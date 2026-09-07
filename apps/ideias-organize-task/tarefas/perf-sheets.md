Auditoria e correção de performance, foco na abertura dos sheets (ShareSheet,
JoinInviteSheet, folha de escolher tarefa e demais bottom sheets): a abertura não
está fluida.

Método (nesta ordem, com evidência antes de mexer):

1. Meça antes de corrigir: habilite temporariamente contadores (renders por
   abertura via profiler do React, tempo até o sheet assentar) e registre o
   baseline nos logs/summary.
2. Suspeitos clássicos em RN, confira um a um no código dos sheets:
   - trabalho síncrono no onPress antes da animação começar (adie com
     InteractionManager/requestAnimationFrame);
   - re-render em cascata: props novas a cada render (objetos/closures inline),
     falta de memo/useCallback nos itens de lista dentro do sheet;
   - listas completas montadas de uma vez dentro do sheet (vire FlatList com
     janela pequena ou monte após a animação);
   - animação em JS thread em vez de native driver / reanimated;
   - leitura de Firestore/AsyncStorage no caminho de abertura (busque antes ou
     mostre esqueleto).
3. Corrija o que a medição confirmar — não otimize por palpite; cada correção
   cita a medição que a justificou.
4. Remova a instrumentação temporária ao final ou proteja com __DEV__.

Fora do escopo: redesenho visual dos sheets, mudanças de comportamento, refactor
além do necessário para a fluidez.
