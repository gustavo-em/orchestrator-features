const useColor =
  !process.env.NO_COLOR &&
  process.env.TERM !== "dumb" &&
  Boolean(process.stdout.isTTY);

const CODES = {
  bold: 1,
  dim: 2,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  gray: 90,
};

function paint(code, text) {
  if (!useColor) return String(text);
  return `[${code}m${text}[0m`;
}

export const style = Object.fromEntries(
  Object.entries(CODES).map(([name, code]) => [name, (text) => paint(code, text)]),
);

export const AGENT_STYLE = {
  feature_lead: { label: "lead", color: "magenta" },
  market_analyst: { label: "mercado", color: "cyan" },
  tester: { label: "tela", color: "yellow" },
  code_reviewer: { label: "codigo", color: "blue" },
  ux_auditor: { label: "ux", color: "green" },
};

const TASK_COLORS = ["cyan", "magenta", "yellow", "green", "blue", "red"];
const LABEL_WIDTH = 9;
const ANSI_PATTERN = /\[[0-9;]*m/g;

export function statusStyle(status) {
  if (status === "PASS" || status === "COMPLETE" || status === "READY") {
    return style.green;
  }
  if (status === "CHANGES_REQUIRED" || status === "FAIL" || status === "STOPPED") {
    return style.yellow;
  }
  if (status === "BLOCKED" || status === "ERROR") return style.red;
  return style.gray;
}

export function formatElapsed(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`;
}

export function visibleLength(text) {
  return String(text).replace(ANSI_PATTERN, "").length;
}

function padVisible(text, width) {
  return text + " ".repeat(Math.max(0, width - visibleLength(text)));
}

export function hintLine(hint) {
  return `${style.yellow("dica")}     ${hint}`;
}

export function rule(title) {
  const line = "-".repeat(Math.max(4, 60 - title.length));
  return style.gray(`-- ${title} ${line}`);
}

export function createPrinter({
  batch = false,
  heartbeatAfterSeconds = 45,
  log = console.log,
} = {}) {
  const lastDetail = new Map();
  const lastPrintAt = new Map();
  const taskColors = new Map();

  const taskTag = (slug) => {
    if (!batch || !slug) return "";
    if (!taskColors.has(slug)) {
      taskColors.set(slug, TASK_COLORS[taskColors.size % TASK_COLORS.length]);
    }
    return `${style[taskColors.get(slug)](slug.slice(0, 18).padEnd(18))} `;
  };

  const agentTag = (agent) => {
    const config = AGENT_STYLE[agent] ?? { label: agent ?? "-", color: "gray" };
    return padVisible(style[config.color](style.bold(config.label)), LABEL_WIDTH);
  };

  const write = (slug, agent, text, elapsedSeconds) => {
    const elapsed = formatElapsed(elapsedSeconds);
    const time = elapsed ? style.gray(` ${elapsed}`) : "";
    log(`${taskTag(slug)}${agentTag(agent)}${text}${time}`);
  };

  const section = (slug, title) => log(`${taskTag(slug)}${rule(title)}`);

  const printFindings = (slug, agent, review) => {
    for (const finding of (review.findings ?? []).slice(0, 5)) {
      write(
        slug,
        agent,
        `${style.dim(`[${finding.priority}]`)} ${finding.title} ${style.gray(`-> ${finding.recommendation}`)}`,
      );
    }
  };

  return function printEvent(event) {
    const slug = event.slug;
    const key = `${slug ?? ""}:${event.agent ?? ""}`;

    switch (event.type) {
      case "task.started":
        log(`${taskTag(slug)}${style.gray("worktree")} ${style.bold(event.branch)}`);
        return;
      case "task.completed":
        log(
          `${taskTag(slug)}${statusStyle(event.status)(style.bold(event.status))} ${style.gray(event.reason ?? "")}`,
        );
        return;
      case "marketing.started":
        section(slug, "mercado: minerando avaliacoes reais");
        return;
      case "marketing.reused":
        write(slug, "market_analyst", style.gray("reaproveitando pesquisa em cache"));
        return;
      case "marketing.completed":
        write(
          slug,
          "market_analyst",
          `${statusStyle(event.result.status)(event.result.status)} ${event.result.summary}`,
        );
        for (const signal of (event.result.signals ?? []).slice(0, 3)) {
          write(
            slug,
            "market_analyst",
            `${style.gray('"')}${signal.quote}${style.gray('"')} ${style.dim(`- ${signal.app}`)}`,
          );
        }
        return;
      case "baseline.started":
        section(slug, "capturando a tela atual antes de decidir");
        return;
      case "baseline.completed":
        write(
          slug,
          "tester",
          style.gray(
            `estado atual capturado: ${(event.evidence.screenshots ?? []).length} screenshot(s)`,
          ),
        );
        return;
      case "baseline.failed":
        write(slug, "tester", style.yellow(`captura falhou: ${event.message}`));
        return;
      case "plan.only":
        write(
          slug,
          "feature_lead",
          style.gray("--plan-only: analise entregue, nenhum arquivo alterado"),
        );
        return;
      case "worth.rejected":
        write(
          slug,
          "feature_lead",
          `${style.yellow(style.bold("NAO VALE A PENA"))} ${event.result.worthReason ?? ""}`,
        );
        return;
      case "lead.planning.started":
        section(slug, "feature_lead: decidindo UX e direcao visual");
        return;
      case "lead.revision.started":
        section(slug, "feature_lead: revisando o brief");
        return;
      case "lead.planning.completed":
      case "lead.revision.completed":
        write(
          slug,
          "feature_lead",
          `${statusStyle(event.result.status)(event.result.status)} ${event.result.summary}`,
        );
        if (event.result.worthBuilding && event.result.worthBuilding !== "yes") {
          write(
            slug,
            "feature_lead",
            `${style.yellow(event.result.worthBuilding === "no" ? "nao vale a pena" : "vale so em parte")}: ${event.result.worthReason ?? ""}`,
          );
          for (const item of event.result.reducedScope ?? []) {
            write(slug, "feature_lead", style.gray(`. ${item}`));
          }
        }
        if (event.result.routeSummary) {
          write(slug, "feature_lead", style.gray(event.result.routeSummary));
        }
        return;
      case "lead.planning.continuation.started":
        write(slug, "feature_lead", style.gray("encerrando inspecao e fechando o brief"));
        return;
      case "cycle.started":
        section(slug, `ciclo ${event.cycle}: implementando`);
        return;
      case "implementation.completed":
        write(
          slug,
          "feature_lead",
          `${statusStyle(event.result.status)(event.result.status)} ${event.result.summary}`,
        );
        for (const change of (event.result.changes ?? []).slice(0, 5)) {
          write(slug, "feature_lead", style.gray(`. ${change}`));
        }
        return;
      case "implementation.continuation.started":
        write(
          slug,
          "feature_lead",
          style.gray("limite de tempo atingido; continuando na mesma sessao"),
        );
        return;
      case "tester.started":
        section(slug, `ciclo ${event.cycle}: validando a tela`);
        return;
      case "code_review.started":
        section(slug, `ciclo ${event.cycle}: revisando o codigo`);
        return;
      case "audit.started":
        section(slug, `ciclo ${event.cycle}: auditando UX e aparencia`);
        return;
      case "tester.completed":
      case "code_review.completed":
      case "audit.completed": {
        const agent =
          event.type === "tester.completed"
            ? "tester"
            : event.type === "code_review.completed"
              ? "code_reviewer"
              : "ux_auditor";
        write(
          slug,
          agent,
          `${statusStyle(event.result.status)(style.bold(event.result.status))} ${event.result.summary}`,
        );
        printFindings(slug, agent, event.result);
        return;
      }
      case "agent.progress": {
        const detail = event.lane ? `${event.lane}: ${event.detail}` : event.detail;
        const now = Date.now();
        if (event.kind === "heartbeat") {
          if (now - (lastPrintAt.get(key) ?? 0) < heartbeatAfterSeconds * 1000) {
            return;
          }
          lastPrintAt.set(key, now);
          write(
            slug,
            event.agent,
            style.gray(lastDetail.get(key) ?? "trabalhando"),
            event.elapsedSeconds,
          );
          return;
        }
        if (!detail || detail === lastDetail.get(key)) return;
        lastDetail.set(key, detail);
        lastPrintAt.set(key, now);
        write(slug, event.agent, style.gray(detail), event.elapsedSeconds);
        return;
      }
      default:
    }
  };
}
