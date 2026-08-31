export const marketLanes = [
  {
    id: "abandono",
    title: "Por que as pessoas abandonam",
    focus: `
- Procure avaliações de 1 e 2 estrelas, posts de "desinstalei", "desisti", "parei de usar".
- O alvo é o momento exato da desistência: o que a pessoa estava tentando fazer e o que quebrou.
- Separe frustração de bug (temporária) de frustração de modelo do produto (estrutural).
- Preste atenção em fracasso de constância: ficar para trás, perder streak, plano longo demais.`,
  },
  {
    id: "adocao",
    title: "Por que instalam e por que continuam",
    focus: `
- Procure avaliações de 4 e 5 estrelas, relatos de primeira semana e de uso longo.
- O alvo é o ganho percebido nas palavras da pessoa, não a lista de features.
- Registre a linguagem exata usada para descrever o benefício: ela vira copy de loja e de onboarding.
- Inclua o que a pessoa diz sobre o primeiro uso quando aparecer.`,
  },
  {
    id: "monetizacao",
    title: "Preço, paywall e reação a pagar",
    focus: `
- Descubra onde o paywall aparece, o que fica grátis e qual é o preço atual com data.
- O alvo é a reação: recusa, aceitação, arrependimento, pedido de reembolso, "só descobri que era pago depois".
- Registre quando a cobrança em si afasta gente que gostou do produto.
- Não invente receita, conversão, downloads ou ranking.`,
  },
];

const laneById = new Map(marketLanes.map((lane) => [lane.id, lane]));

export function getMarketLane(laneId) {
  const lane = laneById.get(laneId);
  if (!lane) throw new Error(`Faixa de pesquisa desconhecida: ${laneId}.`);
  return lane;
}

export const marketAnalyst = {
  name: "market_analyst",
  description:
    "Minera avaliações reais de concorrentes em faixas paralelas e entrega evidência de churn, adoção e preço.",

  buildLanePrompt({ lane, task, acceptanceCriteria, appContext, competitors }) {
    return `
Você é market_analyst na faixa "${lane.title}". Use $marketing e pesquisa web ao vivo.

Objetivo: minerar o que usuários reais dizem sobre concorrentes e devolver evidência
que possa mudar a feature, a copy ou o modelo de negócio.

Foco desta faixa:${lane.focus}

Regras:
- Comparação de features não é o entregável. O entregável é motivo, na palavra do usuário.
- Vá além de App Store e Google Play: Reddit, fóruns, comentários de vídeo e posts de review costumam ter texto mais rico.
- Cada sinal precisa de citação curta e literal (máximo 200 caracteres), app, URL e data de acesso.
- Marque "recorrente" somente quando o mesmo motivo aparecer em fontes ou pessoas diferentes; caso contrário "isolado".
- Avaliação é amostra enviesada: registre padrão observado, nunca frequência estatística.
- Traduza a citação apenas se o original não for português ou inglês; mantenha o sentido.
- Não invente downloads, receita, ranking, conversão, retenção ou market share.
- Separe observação de inferência. Opportunities e risks são inferência sua.
- Não edite arquivos, não audite código local e não inicie agentes.
- Máximo 8 sinais e 5 itens por lista. Pare quando os motivos começarem a repetir.

App:
${JSON.stringify(appContext)}

Feature em estudo:
${task}

Critérios:
${acceptanceCriteria}

Concorrentes/URLs sugeridos:
${JSON.stringify(competitors)}

Retorne somente JSON solicitado.
`.trim();
  },
};

function dedupeStrings(values, limit) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const key = String(value).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(value);
    if (output.length >= limit) break;
  }
  return output;
}

export function mergeMarketLanes(laneResults) {
  const usable = laneResults.filter((result) => result && result.status !== "BLOCKED");
  const signals = [];
  const seenQuotes = new Set();

  for (const result of laneResults) {
    for (const signal of result?.signals ?? []) {
      const key = String(signal.quote ?? "").trim().toLowerCase();
      if (!key || seenQuotes.has(key)) continue;
      seenQuotes.add(key);
      signals.push({
        ...signal,
        quote: String(signal.quote).slice(0, 200),
        meaning: String(signal.meaning ?? "").slice(0, 240),
        lane: result.lane,
      });
    }
  }

  signals.sort((a, b) => {
    const rank = (signal) => (signal.strength === "recorrente" ? 0 : 1);
    return rank(a) - rank(b);
  });

  return {
    status: usable.length ? "COMPLETE" : "BLOCKED",
    summary: usable.length
      ? usable.map((result) => `${result.lane}: ${result.summary}`).join(" ")
      : `Nenhuma faixa de pesquisa concluiu. ${
          laneResults.find((result) => result?.summary)?.summary ?? ""
        }`.trim(),
    lanes: laneResults.map((result) => ({
      lane: result?.lane ?? "desconhecida",
      status: result?.status ?? "BLOCKED",
      summary: result?.summary ?? "",
    })),
    signals: signals.slice(0, 12),
    opportunities: dedupeStrings(
      laneResults.flatMap((result) => result?.opportunities ?? []),
      6,
    ),
    risks: dedupeStrings(
      laneResults.flatMap((result) => result?.risks ?? []),
      6,
    ),
    featureContext: dedupeStrings(
      laneResults.flatMap((result) => result?.featureContext ?? []),
      6,
    ),
    accessedAt: new Date().toISOString(),
  };
}
