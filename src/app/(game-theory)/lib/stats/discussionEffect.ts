import type { PersonaDecisionEvent } from "../../types";
import type { ParsedSession, StatsData } from "./types";

// ── Discussion effect: with vs without ──────────────────────────────────────
// Only for games that support discussion (discussionRounds > 0 by default).
// Games with 0 discussion rounds by default are excluded.

function splitByDiscussion(sessions: ParsedSession[]): {
  withDiscussion: ParsedSession[];
  withoutDiscussion: ParsedSession[];
} {
  const withDiscussion: ParsedSession[] = [];
  const withoutDiscussion: ParsedSession[] = [];

  for (const s of sessions) {
    const dr = s.extra.discussionRounds;
    // If discussionRounds is explicitly 0, it's "without discussion"
    // If undefined, it uses the game type default (which has discussion)
    if (dr === 0) {
      withoutDiscussion.push(s);
    } else {
      withDiscussion.push(s);
    }
  }

  return { withDiscussion, withoutDiscussion };
}

function getR1Decisions(sessions: ParsedSession[]): PersonaDecisionEvent[] {
  return sessions.flatMap((s) =>
    s.timeline.filter(
      (e): e is PersonaDecisionEvent =>
        e.type === "persona-decision" && e.round === 1,
    ),
  );
}

type MetricExtractor = (decisions: PersonaDecisionEvent[]) => number;

function computeDiscussionComparison(
  sessions: ParsedSession[],
  metric: MetricExtractor,
  metricLabel: string,
): StatsData {
  const { withDiscussion, withoutDiscussion } = splitByDiscussion(sessions);

  const withDec = getR1Decisions(withDiscussion);
  const withoutDec = getR1Decisions(withoutDiscussion);

  const withVal = withDec.length > 0 ? metric(withDec) : 0;
  const withoutVal = withoutDec.length > 0 ? metric(withoutDec) : 0;

  return {
    columns: [
      { key: "with", label: "With Discussion", format: "percent" },
      { key: "without", label: "Without Discussion", format: "percent" },
    ],
    rows: [
      {
        label: metricLabel,
        values: {
          with: Number.isNaN(withVal) ? 0 : withVal,
          without: Number.isNaN(withoutVal) ? 0 : withoutVal,
        },
      },
    ],
  };
}

/**
 * For binary-decision games: show both sides of the decision
 * (e.g., "Choose Stag" + "Choose Hare") so readers see the full shift.
 */
function computeDiscussionBinaryBreakdown(
  sessions: ParsedSession[],
  predicate: MetricExtractor,
  labelA: string,
  labelB: string,
): StatsData {
  const { withDiscussion, withoutDiscussion } = splitByDiscussion(sessions);

  const withDec = getR1Decisions(withDiscussion);
  const withoutDec = getR1Decisions(withoutDiscussion);

  const withRate = withDec.length > 0 ? predicate(withDec) : 0;
  const withoutRate = withoutDec.length > 0 ? predicate(withoutDec) : 0;

  const safeWith = Number.isNaN(withRate) ? 0 : withRate;
  const safeWithout = Number.isNaN(withoutRate) ? 0 : withoutRate;

  return {
    columns: [
      { key: "with", label: "With Discussion", format: "percent" },
      { key: "without", label: "Without Discussion", format: "percent" },
    ],
    rows: [
      { label: labelA, values: { with: safeWith, without: safeWithout } },
      { label: labelB, values: { with: 1 - safeWith, without: 1 - safeWithout } },
    ],
  };
}

// ── Rate extractors ─────────────────────────────────────────────────────────

const stagRate: MetricExtractor = (decs) =>
  decs.filter((d) => (d.content as { action: string }).action === "stag").length / decs.length;

const volunteerRate: MetricExtractor = (decs) =>
  decs.filter((d) => (d.content as { action: string }).action === "volunteer").length / decs.length;

const pullLeverRate: MetricExtractor = (decs) =>
  decs.filter((d) => (d.content as { classicScenario: string }).classicScenario === "pull_lever").length / decs.length;

const meanContribution: MetricExtractor = (decs) => {
  const contributions = decs.map((d) => (d.content as { contribution: number }).contribution);
  return contributions.reduce((a, b) => a + b, 0) / contributions.length / 20; // normalize to 0-1
};

const meanGuess: MetricExtractor = (decs) => {
  const guesses = decs.map((d) => (d.content as { number: number }).number);
  return guesses.reduce((a, b) => a + b, 0) / guesses.length / 100; // normalize to 0-1
};

const meanBid: MetricExtractor = (decs) => {
  const bids = decs
    .map((d) => (d.content as { bid: number }).bid)
    .filter((b): b is number => typeof b === "number" && !Number.isNaN(b));
  return bids.length > 0 ? bids.reduce((a, b) => a + b, 0) / bids.length / 150 : 0;
};

// ── Exports per game type ───────────────────────────────────────────────────
// Only games with discussion support (discussionRounds > 0 default)

export const discussionEffectComputers: Record<string, (sessions: ParsedSession[]) => StatsData> = {
  // Binary-decision games — show both sides of the choice
  "stag-hunt": (s) => computeDiscussionBinaryBreakdown(s, stagRate, "Choose Stag", "Choose Hare"),
  "volunteer-dilemma": (s) => computeDiscussionBinaryBreakdown(s, volunteerRate, "Volunteer", "Abstain"),
  "trolley-problem": (s) => computeDiscussionBinaryBreakdown(s, pullLeverRate, "Pull Lever", "Don't Pull"),

  // Continuous-metric games — single aggregate value
  "public-goods": (s) => computeDiscussionComparison(s, meanContribution, "Avg. Contribution"),
  "beauty-contest": (s) => computeDiscussionComparison(s, meanGuess, "Avg. Guess"),
  "all-pay-auction": (s) => computeDiscussionComparison(s, meanBid, "Avg. Bid"),
  "colonel-blotto": (s) => {
    const conc: MetricExtractor = (decs) => {
      const concentrations = decs
        .map((d) => {
          const c = d.content as { battlefield1: number; battlefield2: number; battlefield3: number; battlefield4: number };
          const vals = [c.battlefield1, c.battlefield2, c.battlefield3, c.battlefield4];
          if (vals.some((v) => typeof v !== "number" || Number.isNaN(v))) return null;
          vals.sort((a, b) => b - a);
          return vals[0] / 6;
        })
        .filter((v): v is number => v !== null);
      return concentrations.length > 0
        ? concentrations.reduce((a, b) => a + b, 0) / concentrations.length
        : 0;
    };
    return computeDiscussionComparison(s, conc, "Top BF Concentration");
  },
};
