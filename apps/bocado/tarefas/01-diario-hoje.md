Construir a tela inicial "Hoje": o diário do dia com número-resposta (kcal
restantes), barra de progresso fina, três barras de macro, faixa de dias da
semana e as quatro refeições fixas (Café da manhã, Almoço, Café da tarde,
Jantar), cada uma com subtotal e botão "Adicionar" — mais a tela "Metas" com
edição manual da meta diária (kcal e macros em gramas).

Inclui a fundação de dados: migrações SQLite (foods, foods_fts, diary_entries,
food_usage), importação do seed `assets/data/foods.seed.json` no primeiro
lançamento em background, repositório do diário com totais por dia e metas no
MMKV (padrão 2.000 kcal / 120 / 250 / 65 g).

Decisões fechadas e evidência esperada: `docs/specs/01-diario-hoje.md` (leia
na fase de planejamento). Regras fixas valem; copy em pt-BR e en-US; tema
claro e escuro; nunca vermelho ao passar da meta. Nesta tarefa não existe
busca de alimento: o botão "Adicionar" pode abrir uma tela vazia com o título
da refeição e o texto "Em breve" — a tarefa 02 a substitui.
