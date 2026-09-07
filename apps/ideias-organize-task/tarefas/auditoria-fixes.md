Implementar TODOS os achados da auditoria de usabilidade. O contrato é o próprio
documento: `docs/product/auditoria-usabilidade.md` (achados A01-A17, com
gravidade, heurística, evidência e menor correção cada um). Leia-o inteiro antes
de planejar.

Ordem de ataque: o Top 5 do documento primeiro, depois os demais ATRAPALHA,
depois os PODERIA SER MELHOR:

1. A01 — seção do dia nasce fechada (o uso diário exige toque antes de ver
   qualquer tarefa).
2. A11 — conta nova abre com dados da sessão anterior — TRATE COMO BUG DE
   PRIVACIDADE, prioridade máxima: logout/troca de conta precisa limpar o estado
   local visível.
3. A10 — link de compartilhamento exibido junto com erro do servidor (usuário
   pode enviar link que não funciona).
4. A12 — cartão de foco sem o nome da tarefa.
5. A02 — abas sem papel de controle para leitor de tela.
6. Demais: A03-A09, A13, A15-A17 conforme a menor correção proposta no doc.

Reconciliação obrigatória (o documento foi escrito ANTES das tarefas
combinado-clareza, telas-botoes-2, foco-inline e menu-premium): para cada
achado, confira o estado ATUAL do código/tela antes de mexer —

- A02/A03 (papéis e 48dp nas abas) podem já ter sido resolvidos por
  menu-premium; verifique e pule se resolvidos.
- A12/A13 (cartão e recorte da tela Foco) podem ter ficado obsoletos se
  foco-inline removeu a aba; se a sessão imersiva ainda exibir cartão de
  tarefa, o achado se aplica lá.
- Achado já resolvido: registre "já resolvido por <tarefa>" no summary e siga.

Restrições: cada correção é a MENOR proposta no documento — sem redesenho, sem
escopo extra; regras fixas do app valem sempre; copy nova nos dois idiomas.
