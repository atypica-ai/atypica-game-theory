import type { PersonaDecisionEvent } from "../../types";
import type { ParsedSession, StatsData } from "./types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function getDecisions(sessions: ParsedSession[], round?: number): PersonaDecisionEvent[] {
  return sessions.flatMap((s) =>
    s.timeline.filter(
      (e): e is PersonaDecisionEvent =>
        e.type === "persona-decision" && (round === undefined || e.round === round),
    ),
  );
}

function getDecisionsByRound(sessions: ParsedSession[]): Map<number, PersonaDecisionEvent[]> {
  const byRound = new Map<number, PersonaDecisionEvent[]>();
  for (const s of sessions) {
    for (const e of s.timeline) {
      if (e.type !== "persona-decision") continue;
      const d = e as PersonaDecisionEvent;
      const arr = byRound.get(d.round) ?? [];
      arr.push(d);
      byRound.set(d.round, arr);
    }
  }
  return byRound;
}

const AI_COL = { key: "ai", label: "AI Personas", format: "percent" as const };
const HUMAN_COL_TEMPLATE = (source: string) => ({
  key: "human",
  label: `Human (${source})`,
  format: "percent" as const,
});

// ── Prisoner's Dilemma: betrayal rate by round ──────────────────────────────
// Human: Dal Bo & Frechette 2011, AER — Easy treatment, 4-round finite horizon
// Betrayal rate = 1 − cooperation rate

const PD_HUMAN = [0.38, 0.48, 0.57, 0.66]; // R1–R4 (defect rates)

export function computePrisonerDilemma(sessions: ParsedSession[]): StatsData {
  const byRound = getDecisionsByRound(sessions);
  const rows = [1, 2, 3, 4].map((round, i) => {
    const decisions = byRound.get(round) ?? [];
    const defectCount = decisions.filter(
      (d) => (d.content as { action: string }).action === "defect",
    ).length;
    const aiRate = decisions.length > 0 ? defectCount / decisions.length : 0;
    return { label: `R${round}`, values: { ai: aiRate, human: PD_HUMAN[i] } };
  });

  return {
    columns: [AI_COL, HUMAN_COL_TEMPLATE("Dal Bo & Frechette 2011")],
    rows,
  };
}

// ── Stag Hunt: stag-choice rate by round ────────────────────────────────────
// Human: Van Huyck et al. 1990

const SH_HUMAN = [0.58, 0.38, 0.22]; // R1–R3

export function computeStagHunt(sessions: ParsedSession[]): StatsData {
  const byRound = getDecisionsByRound(sessions);
  const rows = [1, 2, 3].map((round, i) => {
    const decisions = byRound.get(round) ?? [];
    const stagCount = decisions.filter(
      (d) => (d.content as { action: string }).action === "stag",
    ).length;
    const aiRate = decisions.length > 0 ? stagCount / decisions.length : 0;
    return { label: `R${round}`, values: { ai: aiRate, human: SH_HUMAN[i] } };
  });

  return {
    columns: [AI_COL, HUMAN_COL_TEMPLATE("Van Huyck et al. 1990")],
    rows,
  };
}

// ── Golden Ball: steal rate by round ────────────────────────────────────────
// Human: van den Assem et al. 2012
// Steal rate = 1 − split rate

const GB_HUMAN = [0.45, 0.51, 0.57]; // R1–R3 (steal rates)

export function computeGoldenBall(sessions: ParsedSession[]): StatsData {
  const byRound = getDecisionsByRound(sessions);
  const rows = [1, 2, 3].map((round, i) => {
    const decisions = byRound.get(round) ?? [];
    const stealCount = decisions.filter(
      (d) => (d.content as { action: string }).action === "steal",
    ).length;
    const aiRate = decisions.length > 0 ? stealCount / decisions.length : 0;
    return { label: `R${round}`, values: { ai: aiRate, human: GB_HUMAN[i] } };
  });

  return {
    columns: [AI_COL, HUMAN_COL_TEMPLATE("van den Assem et al. 2012")],
    rows,
  };
}

// ── Beauty Contest: guess distribution (Round 1 only) ───────────────────────
// Human: Nagel 1995 — reconstructed from Figure 1

const BC_BINS = ["0–9", "10–19", "20–29", "30–39", "40–49", "50–59", "60–69", "70–79", "80–89", "90–100"];
const BC_HUMAN = [0.05, 0.15, 0.38, 0.28, 0.08, 0.04, 0.01, 0.01, 0.00, 0.00];

function bcBinIndex(n: number): number {
  if (n >= 90) return 9;
  return Math.min(Math.floor(n / 10), 8);
}

export function computeBeautyContest(sessions: ParsedSession[]): StatsData {
  const r1 = getDecisions(sessions, 1);
  const counts = new Array(10).fill(0) as number[];

  for (const d of r1) {
    const num = (d.content as { number: number }).number;
    counts[bcBinIndex(num)] += 1;
  }

  const total = r1.length || 1;
  const rows = BC_BINS.map((bin, i) => ({
    label: bin,
    values: { ai: counts[i] / total, human: BC_HUMAN[i] },
  }));

  return {
    columns: [AI_COL, HUMAN_COL_TEMPLATE("Nagel 1995")],
    rows,
  };
}

// ── Public Goods: contribution distribution (Round 1 only) ──────────────────
// Human: Ledyard 1995 meta-analysis

const PG_BINS = ["0-4", "5-9", "10-14", "15-19", "20"];
const PG_HUMAN = [0.25, 0.20, 0.25, 0.20, 0.10];

function pgBinIndex(c: number): number {
  if (c >= 20) return 4;
  if (c >= 15) return 3;
  if (c >= 10) return 2;
  if (c >= 5) return 1;
  return 0;
}

export function computePublicGoods(sessions: ParsedSession[]): StatsData {
  const r1 = getDecisions(sessions, 1);
  const counts = new Array(5).fill(0) as number[];

  for (const d of r1) {
    const contribution = (d.content as { contribution: number }).contribution;
    counts[pgBinIndex(contribution)] += 1;
  }

  const total = r1.length || 1;
  const rows = PG_BINS.map((bin, i) => ({
    label: bin,
    values: { ai: counts[i] / total, human: PG_HUMAN[i] },
  }));

  return {
    columns: [AI_COL, HUMAN_COL_TEMPLATE("Ledyard 1995")],
    rows,
  };
}

// ── Ultimatum Game: offer distribution (Round 1 only) ───────────────────────
// Human: Guth et al. 1982 — proposer offers

const UG_BINS = ["0–19%", "20–29%", "30–39%", "40–49%", "50%+"];
const UG_HUMAN = [0.05, 0.08, 0.15, 0.35, 0.37];

function ugBinIndex(proposerShare: number): number {
  // proposerShare = what proposer keeps. Offer to responder = 100 - proposerShare.
  const offer = 100 - proposerShare;
  if (offer >= 50) return 4;
  if (offer >= 40) return 3;
  if (offer >= 30) return 2;
  if (offer >= 20) return 1;
  return 0;
}

export function computeUltimatumGame(sessions: ParsedSession[]): StatsData {
  const r1 = getDecisions(sessions, 1);
  const counts = new Array(5).fill(0) as number[];
  let proposerCount = 0;

  for (const d of r1) {
    const content = d.content as { action: string; proposerShare?: number };
    if (content.action !== "propose" || content.proposerShare === undefined) continue;
    counts[ugBinIndex(content.proposerShare)] += 1;
    proposerCount += 1;
  }

  const total = proposerCount || 1;
  const rows = UG_BINS.map((bin, i) => ({
    label: bin,
    values: { ai: counts[i] / total, human: UG_HUMAN[i] },
  }));

  return {
    columns: [AI_COL, HUMAN_COL_TEMPLATE("Guth et al. 1982")],
    rows,
  };
}

// ── Volunteer Dilemma: volunteer rate (Round 1 only) ────────────────────────
// Human: Diekmann 1985, Franzen 1995

const VD_HUMAN = [0.45, 0.55]; // Volunteer, Not Volunteer

export function computeVolunteerDilemma(sessions: ParsedSession[]): StatsData {
  const r1 = getDecisions(sessions, 1);
  const volunteerCount = r1.filter(
    (d) => (d.content as { action: string }).action === "volunteer",
  ).length;
  const total = r1.length || 1;
  const volRate = volunteerCount / total;

  return {
    columns: [AI_COL, HUMAN_COL_TEMPLATE("Diekmann 1985")],
    rows: [
      { label: "Volunteer", values: { ai: volRate, human: VD_HUMAN[0] } },
      { label: "Not Volunteer", values: { ai: 1 - volRate, human: VD_HUMAN[1] } },
    ],
  };
}

// ── All-Pay Auction: bid distribution (Round 1 only) ────────────────────────
// Human: Gneezy & Smorodinsky 2006

const APA_BINS = ["0–19", "20–39", "40–59", "60–79", "80–99", "100+"];
const APA_HUMAN = [0.05, 0.08, 0.12, 0.20, 0.35, 0.20];

function apaBinIndex(bid: number): number {
  if (bid >= 100) return 5;
  return Math.min(Math.floor(bid / 20), 4);
}

export function computeAllPayAuction(sessions: ParsedSession[]): StatsData {
  const r1 = getDecisions(sessions, 1);
  const counts = new Array(6).fill(0) as number[];

  for (const d of r1) {
    const bid = (d.content as { bid: number }).bid;
    counts[apaBinIndex(bid)] += 1;
  }

  const total = r1.length || 1;
  const rows = APA_BINS.map((bin, i) => ({
    label: bin,
    values: { ai: counts[i] / total, human: APA_HUMAN[i] },
  }));

  return {
    columns: [AI_COL, HUMAN_COL_TEMPLATE("Gneezy & Smorodinsky 2006")],
    rows,
  };
}

// ── Trolley Problem: Pull/Push rates (Round 1 only) ─────────────────────────
// Human: Thomson 1985

const TP_HUMAN_CLASSIC = [0.75, 0.25]; // Pull, Do Nothing
const TP_HUMAN_FATMAN = [0.15, 0.85]; // Push, Do Nothing

export function computeTrolleyProblem(sessions: ParsedSession[]): StatsData {
  const r1 = getDecisions(sessions, 1);
  const total = r1.length || 1;

  const pullCount = r1.filter(
    (d) => (d.content as { classicScenario: string }).classicScenario === "pull_lever",
  ).length;

  const pushCount = r1.filter(
    (d) => (d.content as { fatManScenario: string }).fatManScenario === "push_man",
  ).length;

  return {
    columns: [AI_COL, HUMAN_COL_TEMPLATE("Thomson 1985")],
    rows: [
      { label: "Classic: Pull Lever", values: { ai: pullCount / total, human: TP_HUMAN_CLASSIC[0] } },
      { label: "Classic: Do Nothing", values: { ai: (total - pullCount) / total, human: TP_HUMAN_CLASSIC[1] } },
      { label: "Fat Man: Push", values: { ai: pushCount / total, human: TP_HUMAN_FATMAN[0] } },
      { label: "Fat Man: Do Nothing", values: { ai: (total - pushCount) / total, human: TP_HUMAN_FATMAN[1] } },
    ],
  };
}

// ── Colonel Blotto: strategy cluster distribution (Round 1 only) ────────────
// Human: Borel 1921, Roberson 2006

const CB_HUMAN = [0.35, 0.30, 0.20, 0.15]; // Concentrate, Balanced, Spread, Weighted

type BlottoAlloc = [number, number, number, number];

function classifyBlottoStrategy(alloc: BlottoAlloc): string {
  const sorted = [...alloc].sort((a, b) => b - a);
  // Concentrate: 2+ battlefields with 0 troops
  if (sorted[2] === 0 && sorted[3] === 0) return "Concentrate";
  // Balanced: all battlefields within 1 troop of each other
  if (sorted[0] - sorted[3] <= 1) return "Balanced";
  // Spread: max diff is 1-2, no zeroes
  if (sorted[3] >= 1 && sorted[0] - sorted[3] <= 1) return "Spread";
  return "Weighted";
}

export function computeColonelBlotto(sessions: ParsedSession[]): StatsData {
  const r1 = getDecisions(sessions, 1);
  const strategyCounts: Record<string, number> = {
    Concentrate: 0,
    Balanced: 0,
    Spread: 0,
    Weighted: 0,
  };

  for (const d of r1) {
    const c = d.content as {
      battlefield1: number;
      battlefield2: number;
      battlefield3: number;
      battlefield4: number;
    };
    const alloc: BlottoAlloc = [c.battlefield1, c.battlefield2, c.battlefield3, c.battlefield4];
    const strategy = classifyBlottoStrategy(alloc);
    strategyCounts[strategy] = (strategyCounts[strategy] ?? 0) + 1;
  }

  const total = r1.length || 1;
  const labels = ["Concentrate", "Balanced", "Spread", "Weighted"];
  const rows = labels.map((label, i) => ({
    label,
    values: { ai: strategyCounts[label] / total, human: CB_HUMAN[i] },
  }));

  return {
    columns: [AI_COL, HUMAN_COL_TEMPLATE("Borel 1921")],
    rows,
  };
}

// ── Registry of distribution compute functions ──────────────────────────────

export const distributionComputers: Record<string, (sessions: ParsedSession[]) => StatsData> = {
  "prisoner-dilemma": computePrisonerDilemma,
  "stag-hunt": computeStagHunt,
  "golden-ball": computeGoldenBall,
  "beauty-contest": computeBeautyContest,
  "public-goods": computePublicGoods,
  "ultimatum-game": computeUltimatumGame,
  "volunteer-dilemma": computeVolunteerDilemma,
  "all-pay-auction": computeAllPayAuction,
  "trolley-problem": computeTrolleyProblem,
  "colonel-blotto": computeColonelBlotto,
};
