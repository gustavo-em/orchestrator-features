Três ajustes que compartilham o mesmo orçamento vertical da tela "Hoje", por
isso vão juntos: medir o J6 duas vezes contra números que já mudaram não vale.

As decisões estão fechadas em `docs/research/05-descoberta-ajustes-ui.md`,
seções 1, 2 e 5. Leia essa pesquisa na fase de planejamento: ela traz as
medidas, os contrastes calculados e o porquê de cada escolha, inclusive das
alternativas descartadas.

1. COR DO CARBOIDRATO — o dono não gostou do ocre. Troque em
   `src/theme/colors.ts`: claro `#8A6520` → `#9C5A2C`, escuro `#D9AE64` →
   `#EDA56E`. São dois literais mais a tabela de paleta em `docs/BRAND.md` e
   `docs/DESIGN_SYSTEM.md`. Não mexa em proteína nem em gordura: a seção 2 da
   pesquisa explica por que consertar a gordura agora custa e não entrega.

2. LINHA DO DIÁRIO — a terceira linha de macros ("P 2,5 g · C 28,1 g · G 0,2 g")
   sai do pixel e CONTINUA no áudio. A entrada cai de 72 para 64 dp e as
   calorias ganham coluna fixa de 46 dp alinhada à direita. Anatomia exata,
   remoções por arquivo e linha, e os três pontos de montagem (Hoje, tela da
   refeição e o painel da bandeja) estão na seção 1 da pesquisa. O rótulo de
   acessibilidade mantém os macros: some do pixel, não do áudio.

3. SUGESTÕES PERSISTENTES — a linha de chips passa a existir também na refeição
   que já tem itens, no fim da seção, a 8 dp da última entrada, com no máximo
   dois chips. O item recém-adicionado sai das sugestões. O fallback de
   starters continua ligado, senão a funcionalidade não existe para usuário
   novo. Anatomia e a conta de altura refeita estão na seção 5.

4. CONVERSÃO AO TROCAR DE UNIDADE — defeito encontrado no aparelho em
   2026-09-09, ao montar as capturas do README. Com o padrão em 100 g (tarefa
   09) somado à conversão que preserva a massa (tarefa 03), tocar num chip de
   medida caseira produz frações que ninguém fala: "0,67 copo americano",
   "1,33 unidade", "2 unidade" para um pão. Corrija a direção do padrão:
   trocar PARA uma medida caseira passa a assumir quantidade 1, que é a
   intenção quase sempre; trocar PARA gramas continua preservando a massa,
   porque nessa direção o número exato é justamente o que se quer. Se o
   alimento já tinha porção lembrada, ela continua vencendo.

Meça no J6 e relate: quantas entradas ficam visíveis por refeição depois da
mudança, e se arrastar a linha de chips troca o dia (o `ChipRow` usa ScrollView
puro contra o gesto de dia; a pesquisa aponta isso como risco 6).

Regras fixas valem. Nenhuma cor nova além da troca do carboidrato, nenhuma
tipografia nova, nenhuma animação nova.
