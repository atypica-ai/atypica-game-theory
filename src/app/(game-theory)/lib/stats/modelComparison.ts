import type { PersonaDecisionEvent } from "../../types";
import type { ParsedSession, StatsData, StatsColumn } from "./types";
import { getPersonaModel } from "./aggregate";

// ── Per-game metric by model ────────────────────────────────────────────────

/** Normalize model name to a short display label */
function modelLabel(model: string): string {
  // Keep short aliases: "claude-haiku-4-5" → "Claude Haiku 4.5"
  const aliases: Record<string, string> = {
    "claude-haiku-4-5": "Claude Haiku",
    "claude-sonnet-4": "Claude Sonnet",
    "claude-sonnet-4-5": "Claude Sonnet 4.5",
    "gemini-3-flash": "Gemini Flash",
    "gemini-2.5-flash": "Gemini 2.5 Flash",
    "gpt-4.1-mini": "GPT 4.1 Mini",
    "gpt-5-mini": "GPT 5 Mini",
    "gpt-4o": "GPT 4o",
  };
  return aliases[model] ?? model;
}

interface DecisionWithModel {
  decision: PersonaDecisionEvent;
  model: string;
}

function getDecisionsWithModel(
  sessions: ParsedSession[],
  round?: number,
): DecisionWithModel[] {
  const result: DecisionWithModel[] = [];
  for (const s of sessions) {
    for (const e of s.timeline) {
      if (e.type !== "persona-decision") continue;
      const d = e as PersonaDecisionEvent;
      if (round !== undefined && d.round !== round) continue;
      const model = getPersonaModel(s, d.personaId);
      if (!model) continue;
      result.push({ decision: d, model });
    }
  }
  return result;
}

function buildModelColumns(models: string[]): StatsColumn[] {
  return models.map((m) => ({
    key: m,
    label: modelLabel(m),
    format: "percent" as const,
  }));
}

// ── Game-specific model comparison functions ─────────────────────────────────

type RateExtractor = (d: PersonaDecisionEvent) => boolean;

/** For games with binary actions across rounds (PD, SH, GB) */
function computeByRoundByModel(
  sessions: ParsedSession[],
  rounds: number[],
  predicate: RateExtractor,
): StatsData {
  const allModels = new Set<string>();
  const dataByRound = new Map<number, Map<string, { count: number; total: number }>>();

  for (const round of rounds) {
    const decisions = getDecisionsWithModel(sessions, round);
    const modelStats = new Map<string, { count: number; total: number }>();
    for (const { decision, model } of decisions) {
      allModels.add(model);
      const stat = modelStats.get(model) ?? { count: 0, total: 0 };
      stat.total += 1;
      if (predicate(decision)) stat.count += 1;
      modelStats.set(model, stat);
    }
    dataByRound.set(round, modelStats);
  }

  const models = [...allModels].sort();
  const rows = rounds.map((round) => {
    const modelStats = dataByRound.get(round)!;
    const values: Record<string, number> = {};
    for (const m of models) {
      const stat = modelStats.get(m);
      values[m] = stat && stat.total > 0 ? stat.count / stat.total : 0;
    }
    return { label: `R${round}`, values };
  });

  return { columns: buildModelColumns(models), rows };
}

/** For games with a single numeric metric in Round 1 */
function computeR1MeanByModel(
  sessions: ParsedSession[],
  extractor: (d: PersonaDecisionEvent) => number | null,
  format: "percent" | "decimal" = "decimal",
): StatsData {
  const modelSums = new Map<string, { sum: number; count: number }>();

  for (const { decision, model } of getDecisionsWithModel(sessions, 1)) {
    const val = extractor(decision);
    if (val == null || Number.isNaN(val)) continue;
    const stat = modelSums.get(model) ?? { sum: 0, count: 0 };
    stat.sum += val;
    stat.count += 1;
    modelSums.set(model, stat);
  }

  const models = [...modelSums.keys()].sort();
  const values: Record<string, number> = {};
  for (const m of models) {
    const stat = modelSums.get(m)!;
    values[m] = stat.count > 0 ? stat.sum / stat.count : 0;
  }

  return {
    columns: [{ key: "mean", label: "Mean", format }],
    rows: models.map((m) => ({
      label: modelLabel(m),
      values: { mean: values[m] },
      meta: { model: m },
    })),
  };
}

/** For games with a binary action in Round 1 */
function computeR1RateByModel(
  sessions: ParsedSession[],
  predicate: RateExtractor,
): StatsData {
  const modelStats = new Map<string, { count: number; total: number }>();

  for (const { decision, model } of getDecisionsWithModel(sessions, 1)) {
    const stat = modelStats.get(model) ?? { count: 0, total: 0 };
    stat.total += 1;
    if (predicate(decision)) stat.count += 1;
    modelStats.set(model, stat);
  }

  const models = [...modelStats.keys()].sort();
  const values: Record<string, number> = {};
  for (const m of models) {
    const stat = modelStats.get(m)!;
    values[m] = stat.total > 0 ? stat.count / stat.total : 0;
  }

  return {
    columns: [{ key: "rate", label: "Rate", format: "percent" }],
    rows: models.map((m) => ({
      label: modelLabel(m),
      values: { rate: values[m] },
      meta: { model: m },
    })),
  };
}

// ── Exports per game type ───────────────────────────────────────────────────

const isCooperate: RateExtractor = (d) =>
  (d.content as { action: string }).action === "cooperate";
const isStag: RateExtractor = (d) =>
  (d.content as { action: string }).action === "stag";
const isSplit: RateExtractor = (d) =>
  (d.content as { action: string }).action === "split";
const isVolunteer: RateExtractor = (d) =>
  (d.content as { action: string }).action === "volunteer";
const isPullLever: RateExtractor = (d) =>
  (d.content as { classicScenario: string }).classicScenario === "pull_lever";

export const modelComparisonComputers: Record<string, (sessions: ParsedSession[]) => StatsData> = {
  "prisoner-dilemma": (s) => computeByRoundByModel(s, [1, 2, 3, 4], isCooperate),
  "stag-hunt": (s) => computeByRoundByModel(s, [1, 2, 3], isStag),
  "golden-ball": (s) => computeByRoundByModel(s, [1, 2, 3], isSplit),
  "beauty-contest": (s) =>
    computeR1MeanByModel(s, (d) => (d.content as { number: number }).number),
  "public-goods": (s) =>
    computeR1MeanByModel(s, (d) => (d.content as { contribution: number }).contribution),
  "ultimatum-game": (s) =>
    computeR1MeanByModel(s, (d) => {
      const c = d.content as { action: string; proposerShare?: number };
      return c.action === "propose" && c.proposerShare !== undefined
        ? 100 - c.proposerShare
        : null;
    }),
  "volunteer-dilemma": (s) => computeR1RateByModel(s, isVolunteer),
  "all-pay-auction": (s) =>
    computeR1MeanByModel(s, (d) => (d.content as { bid: number }).bid),
  "trolley-problem": (s) => computeR1RateByModel(s, isPullLever),
  "colonel-blotto": (s) =>
    computeR1MeanByModel(s, (d) => {
      // Mean troops on battlefield 1 as a proxy for concentration
      return (d.content as { battlefield1: number }).battlefield1;
    }),
};
