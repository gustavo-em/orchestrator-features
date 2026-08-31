# Orquestrador de Features

Orquestrador híbrido em JavaScript para planejar, implementar, testar e auditar features React Native usando Codex ou Claude Code. O contexto principal permanece em uma única sessão do provedor escolhido; especialistas isolados são acionados somente quando agregam evidência.

## Provedores

- `codex` (padrão): usa `@openai/codex-sdk` e a autenticação local do Codex.
- `claude`: usa `@anthropic-ai/claude-agent-sdk`, sessões retomáveis e JSON Schema nativo.
- O fluxo, prompts, critérios, ADB e estado são compartilhados; apenas execução, permissões, streaming e IDs de sessão mudam.
- A escolha vale para toda a execução. Não há handoff entre modelos no meio de uma feature.

## Agentes

- `feature_lead`: sessão persistente. Planeja com reasoning `high`, implementa com `low` e recebe correções sem redescobrir o projeto.
- `market_analyst`: opcional. Pesquisa concorrentes antes do planejamento.
- `code_reviewer`: opcional. Entra somente para auth, persistência, migração, concorrência, módulos nativos ou mudanças estruturais arriscadas.
- `tester`: opcional e barato. Valida screenshots e evidência Android condensada com reasoning `low`.
- `ux_auditor`: opcional. Combina auditoria comportamental e checagem visual pós-implementação.
- O processo JavaScript é o orquestrador. Os agentes nunca chamam um ao outro diretamente.

## Fluxo

1. Quando ativado, `market_analyst` pesquisa até cinco concorrentes.
2. `feature_lead` usa `high`, inspeciona o projeto, escolhe as skills necessárias e fecha o brief.
3. O mesmo ID de sessão é retomado com `low` e recebe um contrato exato de execução derivado do brief.
4. `code_reviewer` roda apenas quando o próprio brief marca risco técnico material.
5. `tester` roda apenas quando a feature exige evidência de tela e Android está habilitado.
6. `ux_auditor` roda quando há mudança comportamental, visual relevante ou marketing `full`.
7. Correções voltam à mesma thread do `feature_lead`. Redesenho também acontece nela.

Rota padrão para feature relevante:

`market_analyst? → feature_lead (planejar → implementar) → code_reviewer? → tester? → ux_auditor?`

O `?` indica etapa opcional. Mudança trivial pode executar somente no `feature_lead`. A troca de reasoning retoma o mesmo ID e histórico; não cria outro agente nem exige handoff manual.

`feature_lead` usa `$feature-design-orchestrator` no planejamento e `$vercel-react-native-skills` na implementação.

O limite padrão é de três ciclos.

## Requisitos

- Node.js 18 ou superior.
- Codex autenticado localmente para `--provider codex`.
- Claude Code autenticado ou `ANTHROPIC_API_KEY` configurada para `--provider claude`.
- Acesso de escrita ao projeto React Native que será informado em `--project`.

## Instalação

As dependências já estão instaladas nesta pasta. Para reinstalar:

```bash
npm install
```

## Uso interativo

Depois da instalação global local, execute de qualquer pasta:

```bash
orquestrar-features
```

Ou, dentro desta pasta:

```bash
npm start
```

O terminal pergunta provedor, pasta, feature, critérios, Android, marketing, ciclos e timeout. O package Android é detectado em Expo/React Native por `app.json`, `app.config.json`, Gradle ou Manifest. Se houver mais de um, o terminal oferece escolha. Configuração dinâmica em `app.config.js` pode exigir preenchimento manual.

## Uso automatizado

Com tarefa e critérios diretamente no comando:

```bash
npm start -- \
  --project "/caminho/do/seu-app" \
  --task "Adicionar recuperação de senha" \
  --acceptance "Validar e-mail, tratar loading/sucesso/erro/offline e funcionar em iOS e Android"
```

Executando com Claude Code:

```bash
npm start -- \
  --provider claude \
  --project "/caminho/do/seu-app" \
  --task "Adicionar recuperação de senha" \
  --acceptance "Validar todos os estados e manter acessibilidade"
```

Usando arquivos:

```bash
npm start -- \
  --project "/caminho/do/seu-app" \
  --task-file examples/feature-request.md \
  --max-cycles 3
```

Com verificação Android:

```bash
npm start -- \
  --project "/caminho/do/seu-app" \
  --task-file examples/feature-request.md \
  --android-package "com.exemplo.app" \
  --android-activity ".MainActivity" \
  --adb-steps examples/adb-steps.json
```

Os passos ADB aceitos são `tap`, `text`, `keyevent`, `swipe`, `wait` e `checkpoint`. Comandos arbitrários são rejeitados.

Opções adicionais:

```text
--provider <nome>     codex ou claude. Padrão: codex.
--model <id>          Usa um modelo específico; sem essa opção, usa o padrão do provedor.
--aux-model <id>      Modelo opcional mais barato para tester e revisores.
--design-reasoning    Reasoning para UX/visual. Padrão: high.
--code-reasoning      Reasoning para implementação. Padrão: low.
--reasoning <nível>   Compatibilidade: aplica o mesmo nível às duas fases.
--max-cycles <1-10>   Limite rígido de ciclos. Padrão: 3.
--android-package     Ativa teste Android para o package informado.
--android-activity    Activity inicial. Padrão: .MainActivity.
--adb-device          Serial do device quando houver mais de um.
--adb-steps           Arquivo JSON com caminho determinístico e checkpoints.
--marketing-mode      none, context ou full. O modo full exige Android/screenshot.
--app-category        Categoria ou público-alvo do app.
--competitors         Nomes ou URLs separados por vírgula.
--agent-timeout       Timeout base dos agentes em minutos. Padrão: 10.
```

## Segurança operacional

- No Codex, somente `feature_lead` usa sandbox `workspace-write`; especialistas usam `read-only`.
- No Claude, planejamento e especialistas recebem apenas ferramentas de leitura. Implementação recebe `Read`, `Edit`, `Write`, `Glob`, `Grep` e `Bash`.
- ADB roda fora do contexto dos dois modelos.
- Rede e pesquisa web ficam desativadas no feature lead, tester e revisores.
- Apenas `market_analyst` recebe pesquisa web, em sandbox somente leitura.
- MCP externo fica desativado nas sessões internas: o Codex desativa `expo_mcp` e o Claude usa configuração MCP estrita vazia.
- Nenhum agente pode iniciar outro agente.
- Execuções usam streaming: heartbeat aparece a cada 15 segundos.
- Agentes de análise usam timeout base de 10 minutos; implementação recebe no mínimo 30 minutos.
- Se a implementação atingir o limite, `feature_lead` continua na mesma thread e preserva arquivos já alterados.
- Design produz plano atômico, restrições e fora de escopo. Código recebe objetivo, decisões, direção visual, plano, checks e feedback em um contrato JSON compacto.
- Código é proibido de redesenhar, pesquisar mercado, comparar alternativas ou executar refactors fora do contrato.
- Handoffs para especialistas são compactados e não incluem catálogo completo de concorrentes.
- `feature_lead` usa `high` no design e `low` no código; `tester` e `code_reviewer` também usam `low`; demais especialistas usam `medium`.
- `--aux-model` permite usar modelo mais barato nos quatro especialistas sem reduzir o modelo do feature lead.
- Sessões especialistas são lazy: não são criadas nem retomadas até a etapa realmente ser necessária.
- Estado registra provedor, agente ativo, última atividade e IDs de sessão durante execução.
- Estado e saída final registram tokens de entrada, cache, saída e reasoning por agente.
- O estado de cada execução é salvo em `runs/`.
- Screenshots e evidências Android ficam em `runs/*-artifacts/`.
- Saída textual de ADB passa pelo RTK; bytes de imagem nunca entram no contexto.
- A skill `tester` exige relatórios Caveman ultra e limita achados.
- Em repositórios Git, o orquestrador detecta quando um novo ciclo não modifica o workspace.

## Skills no Claude Code

O runtime Claude procura somente as skills necessárias a cada agente. Ele reutiliza instalações existentes nestas pastas, nesta ordem:

1. `<projeto>/.claude/skills`
2. `~/.claude/skills`
3. `~/.codex/skills`
4. `~/.agents/skills`

Skills já nativas do Claude são usadas diretamente. Skills encontradas apenas no Codex recebem links simbólicos dentro de `.claude-skill-bridge/.claude/skills`, pasta gerada e ignorada pelo Git. O runtime libera a ferramenta `Skill` somente quando encontrou skills para aquela etapa. Se uma skill não existir, as regras essenciais já presentes no prompt continuam valendo e a execução não bloqueia apenas por isso.

## Verificação

```bash
npm run check
npm test
```

## Códigos de saída

- `0`: revisão aprovada.
- `1`: erro de configuração ou execução.
- `2`: agente bloqueado.
- `3`: loop interrompido sem aprovação.
