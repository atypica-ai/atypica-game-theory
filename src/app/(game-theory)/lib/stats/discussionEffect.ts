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
  "stag-hunt": (s) => computeDiscussionComparison(s, stagRate, "Stag-choice Rate"),
  "public-goods": (s) => computeDiscussionComparison(s, meanContribution, "Mean Contribution (normalized)"),
  "beauty-contest": (s) => computeDiscussionComparison(s, meanGuess, "Mean Guess (normalized)"),
  "colonel-blotto": (s) => {
    // For Blotto, we compute concentration as a proxy metric
    const conc: MetricExtractor = (decs) => {
      const concentrations = decs
        .map((d) => {
          const c = d.content as { battlefield1: number; battlefield2: number; battlefield3: number; battlefield4: number };
          const vals = [c.battlefield1, c.battlefield2, c.battlefield3, c.battlefield4];
          if (vals.some((v) => typeof v !== "number" || Number.isNaN(v))) return null;
          vals.sort((a, b) => b - a);
          return vals[0] / 6; // max allocation as fraction of total
        })
        .filter((v): v is number => v !== null);
      return concentrations.length > 0
        ? concentrations.reduce((a, b) => a + b, 0) / concentrations.length
        : 0;
    };
    return computeDiscussionComparison(s, conc, "Concentration (max alloc / total)");
  },
  "volunteer-dilemma": (s) => computeDiscussionComparison(s, volunteerRate, "Volunteer Rate"),
  "all-pay-auction": (s) => computeDiscussionComparison(s, meanBid, "Mean Bid (normalized)"),
  "trolley-problem": (s) => computeDiscussionComparison(s, pullLeverRate, "Pull Lever Rate"),
};
