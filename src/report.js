import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMAGES_PER_TASK = 6;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 12 * 1024 * 1024;

const STATUS_TONE = {
  PASS: "ok",
  STOPPED: "warn",
  BLOCKED: "bad",
  ERROR: "bad",
  RUNNING: "warn",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function latestCycleScreenshots(artifactsDirectory, budget) {
  if (!artifactsDirectory) return [];
  let cycleDirectories;
  try {
    const entries = await readdir(artifactsDirectory, { withFileTypes: true });
    cycleDirectories = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("cycle-"))
      .map((entry) => entry.name)
      .sort(
        (a, b) =>
          Number.parseInt(a.slice(6), 10) - Number.parseInt(b.slice(6), 10),
      );
  } catch {
    return [];
  }
  if (!cycleDirectories.length) return [];

  const directory = path.join(
    artifactsDirectory,
    cycleDirectories[cycleDirectories.length - 1],
  );
  let files;
  try {
    files = (await readdir(directory)).filter((name) => name.endsWith(".png")).sort();
  } catch {
    return [];
  }

  const images = [];
  for (const name of files.slice(0, MAX_IMAGES_PER_TASK)) {
    try {
      const bytes = await readFile(path.join(directory, name));
      if (bytes.byteLength > MAX_IMAGE_BYTES) continue;
      if (budget.used + bytes.byteLength > MAX_TOTAL_IMAGE_BYTES) break;
      budget.used += bytes.byteLength;
      images.push({ name, dataUri: `data:image/png;base64,${bytes.toString("base64")}` });
    } catch {
      continue;
    }
  }
  return images;
}

function findingsHtml(title, review) {
  if (!review) return "";
  const tone = STATUS_TONE[review.status] ?? (review.status === "FAIL" ? "bad" : "ok");
  const findings = (review.findings ?? [])
    .map(
      (finding) => `
        <li>
          <strong>${escapeHtml(finding.title)}</strong>
          <span class="prio">${escapeHtml(finding.priority)}</span>
          <div class="muted">${escapeHtml(finding.evidence)}</div>
          <div>${escapeHtml(finding.recommendation)}</div>
        </li>`,
    )
    .join("");

  return `
    <section class="verdict">
      <h4>${escapeHtml(title)} <span class="badge ${tone}">${escapeHtml(review.status)}</span></h4>
      <p>${escapeHtml(review.summary)}</p>
      ${findings ? `<ul class="findings">${findings}</ul>` : ""}
    </section>`;
}

function marketHtml(marketAnalysis) {
  if (!marketAnalysis) return "";
  const list = (items, label) =>
    items?.length
      ? `<div><span class="muted">${label}</span><ul>${items
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}</ul></div>`
      : "";
  return `
    <section class="verdict">
      <h4>Mercado <span class="badge">${escapeHtml(marketAnalysis.status)}</span></h4>
      <p>${escapeHtml(marketAnalysis.summary)}</p>
      ${list(marketAnalysis.opportunities, "Oportunidades")}
      ${list(marketAnalysis.risks, "Riscos")}
    </section>`;
}

function taskHtml(result, images) {
  const state = result.state;
  const status = result.error ? "ERROR" : (state?.finalStatus ?? "ERROR");
  const tone = STATUS_TONE[status] ?? "warn";
  const lastCycle = state?.cycles?.[state.cycles.length - 1];
  const usage = state?.usage;
  const changed = result.worktreeSummary?.changedFiles ?? [];

  return `
  <article class="task ${tone}">
    <header>
      <span class="badge ${tone}">${escapeHtml(status)}</span>
      <h2>${escapeHtml(result.task)}</h2>
    </header>
    <p class="muted">${escapeHtml(state?.stopReason ?? result.error ?? "")}</p>

    ${state?.designBrief ? `<section class="verdict"><h4>Brief</h4><p>${escapeHtml(state.designBrief.summary)}</p>${
      state.designBrief.routeSummary
        ? `<p class="muted">${escapeHtml(state.designBrief.routeSummary)}</p>`
        : ""
    }</section>` : ""}

    ${lastCycle?.implementation ? `<section class="verdict"><h4>Implementação</h4><p>${escapeHtml(lastCycle.implementation.summary)}</p></section>` : ""}

    ${marketHtml(state?.marketAnalysis)}
    ${findingsHtml("Tela", lastCycle?.tester)}
    ${findingsHtml("Código", lastCycle?.codeReview)}
    ${findingsHtml("UX e aparência", lastCycle?.audit)}

    ${images.length ? `<section class="shots">${images
      .map(
        (image) =>
          `<figure><img src="${image.dataUri}" alt="${escapeHtml(image.name)}"><figcaption>${escapeHtml(image.name)}</figcaption></figure>`,
      )
      .join("")}</section>` : ""}

    <section class="meta">
      <div><span class="muted">Branch</span><code>${escapeHtml(result.branch ?? "—")}</code></div>
      <div><span class="muted">Worktree</span><code>${escapeHtml(result.worktreePath ?? "—")}</code></div>
      <div><span class="muted">Diff</span><code>${escapeHtml(result.worktreeSummary?.shortstat || "sem alterações")}</code></div>
      <div><span class="muted">Ciclos</span><code>${escapeHtml(state?.cycles?.length ?? 0)}</code></div>
      ${usage ? `<div><span class="muted">Tokens</span><code>in ${usage.inputTokens} · cache ${usage.cachedInputTokens} · out ${usage.outputTokens}</code></div>` : ""}
    </section>
    ${changed.length ? `<details><summary>${changed.length} arquivos alterados</summary><ul class="files">${changed
      .map((file) => `<li><code>${escapeHtml(file)}</code></li>`)
      .join("")}</ul></details>` : ""}
  </article>`;
}

const STYLES = `
:root{color-scheme:light dark;--bg:#fbfaf8;--fg:#1b1a17;--muted:#6c675f;--card:#fff;--line:#e6e2da;--ok:#1f7a4d;--warn:#8a6100;--bad:#a32c2c}
@media (prefers-color-scheme:dark){:root{--bg:#16150f;--fg:#f0ece4;--muted:#a29c90;--card:#1f1e17;--line:#332f26;--ok:#5fcf95;--warn:#e0b552;--bad:#f08a8a}}
*{box-sizing:border-box}
body{margin:0;padding:32px 20px 64px;background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}
.wrap{max-width:900px;margin:0 auto}
h1{font-size:24px;margin:0 0 4px}
h2{font-size:17px;margin:0}
h4{font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}
.summary{display:flex;gap:20px;flex-wrap:wrap;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--card);margin:16px 0 28px}
.summary div{display:flex;flex-direction:column}
.summary b{font-size:20px}
.task{border:1px solid var(--line);border-left:4px solid var(--line);border-radius:12px;background:var(--card);padding:18px 20px;margin-bottom:20px}
.task.ok{border-left-color:var(--ok)}.task.warn{border-left-color:var(--warn)}.task.bad{border-left-color:var(--bad)}
.task header{display:flex;gap:10px;align-items:baseline;margin-bottom:6px}
.badge{font-size:11px;font-weight:700;letter-spacing:.06em;padding:2px 8px;border-radius:99px;border:1px solid var(--line);color:var(--muted)}
.badge.ok{color:var(--ok);border-color:var(--ok)}.badge.warn{color:var(--warn);border-color:var(--warn)}.badge.bad{color:var(--bad);border-color:var(--bad)}
.muted{color:var(--muted)}
.verdict{margin:14px 0;padding-top:12px;border-top:1px solid var(--line)}
.verdict p{margin:0 0 6px}
.findings{margin:8px 0 0;padding-left:18px}
.findings li{margin-bottom:10px}
.prio{font-size:11px;color:var(--muted);margin-left:6px}
.shots{display:flex;gap:12px;overflow-x:auto;padding:12px 0;margin:12px 0;border-top:1px solid var(--line)}
.shots figure{margin:0;flex:0 0 auto;width:190px}
.shots img{width:100%;border:1px solid var(--line);border-radius:8px;display:block}
.shots figcaption{font-size:11px;color:var(--muted);margin-top:4px}
.meta{display:flex;flex-wrap:wrap;gap:16px;margin-top:14px;padding-top:12px;border-top:1px solid var(--line);font-size:13px}
.meta div{display:flex;flex-direction:column;gap:2px}
code{font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
.files{columns:2;font-size:12px}
details{margin-top:10px}
summary{cursor:pointer;color:var(--muted);font-size:13px}
`;

export async function buildBatchReport({ results, startedAt, finishedAt }) {
  const budget = { used: 0 };
  const ordered = [...results].sort((a, b) => {
    const rank = (item) =>
      item.error ? 0 : item.state?.finalStatus === "PASS" ? 2 : 1;
    return rank(a) - rank(b);
  });

  const cards = [];
  for (const result of ordered) {
    const images = await latestCycleScreenshots(result.artifactsDirectory, budget);
    cards.push(taskHtml(result, images));
  }

  const passed = results.filter((item) => item.state?.finalStatus === "PASS").length;
  const totalTokens = results.reduce(
    (total, item) =>
      total +
      (item.state?.usage?.inputTokens ?? 0) +
      (item.state?.usage?.outputTokens ?? 0),
    0,
  );
  const minutes = Math.round(
    (new Date(finishedAt) - new Date(startedAt)) / 60_000,
  );

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lote de features</title><style>${STYLES}</style></head>
<body><div class="wrap">
<h1>Lote de features</h1>
<p class="muted">${escapeHtml(new Date(startedAt).toLocaleString("pt-BR"))}</p>
<div class="summary">
  <div><span class="muted">Aprovadas</span><b>${passed} de ${results.length}</b></div>
  <div><span class="muted">Duração</span><b>${minutes} min</b></div>
  <div><span class="muted">Tokens</span><b>${totalTokens.toLocaleString("pt-BR")}</b></div>
</div>
${cards.join("\n")}
</div></body></html>`;
}

export async function writeBatchReport(filePath, html) {
  await writeFile(filePath, html, "utf8");
  return filePath;
}
