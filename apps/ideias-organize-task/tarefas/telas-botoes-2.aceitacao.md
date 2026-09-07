1. Nas árvores de UI capturadas: centro-x do ícone ≈ centro-x do rótulo (±4px)
   nas 4 abas da barra inferior, no botão de nova tarefa e nos chips de filtro
   de prazo/projeto/prioridade.
2. Screenshots antes-equivalentes dos três lugares mostrando a centralização.
3. Correção em componente compartilhado; grep não encontra colunas ícone+rótulo
   com alignItems flex-start remanescentes nesses fluxos.
4. Nenhuma outra mudança visual; alvos ≥ 48px preservados; `npm run validate`
   verde.
