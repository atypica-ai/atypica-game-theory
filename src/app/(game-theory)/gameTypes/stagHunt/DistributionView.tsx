"use client";

import { PMFBin, PMFChart } from "@/app/(game-theory)/(page)/HomeView/PMFChart";

const AI_COLOR = "hsl(208 77% 52%)"; // --gt-blue

// ── Human reference data ───────────────────────────────────────────────────────
// Source: Battalio, Samuelson & Van Huyck (2001) — "Optimization Incentives and
// Coordination Failure in Laboratory Stag Hunt Games" — approximate values.
// NOTE: our free-rider variant (public good + private rabbit) differs from classic
// stag hunt; directional reference only. n≈84, 3 rounds.
//
// Reward schedule: stag+success=25, stag+fail=0, rabbit+success=35, rabbit+fail=10

// ── AI persona data ────────────────────────────────────────────────────────────
// Source: atypica.AI mock — TODO replace with live aggregation from game sessions
// AI begins optimistic (high stag), adapts faster toward free-rider equilibrium.

const overallBins: PMFBin[] = [
  { label: "Stag", human: 0.38, ai: 0.52 },
  { label: "Rabbit", human: 0.62, ai: 0.48 },
];

const round1Bins: PMFBin[] = [
  { label: "Stag", human: 0.52, ai: 0.68 },
  { label: "Rabbit", human: 0.48, ai: 0.32 },
];

// Per-round payoff distribution — all 4 possible outcomes in a single round:
//   0  = chose stag, hunt failed (not enough stag hunters)
//  10  = chose rabbit, hunt failed (private reward only)
//  25  = chose stag, hunt succeeded
//  35  = chose rabbit, hunt succeeded (private 10 + public 25 free-rider bonus)
const avgRewardBins: PMFBin[] = [
  { label: "0",  human: 0.14, ai: 0.09 },
  { label: "10", human: 0.48, ai: 0.34 },
  { label: "25", human: 0.13, ai: 0.22 },
  { label: "35", human: 0.25, ai: 0.35 },
];

// Max reward per player across all rounds — distribution of each player's best round:
//   0  = stag hunter, hunt always failed
//  10  = rabbit hunter, hunt never succeeded
//  25  = stag hunter, achieved at least one successful hunt
//  35  = rabbit hunter, free-rode at least one successful hunt (dominant strategy peak)
const maxRewardBins: PMFBin[] = [
  { label: "0",  human: 0.06, ai: 0.03 },
  { label: "10", human: 0.34, ai: 0.22 },
  { label: "25", human: 0.21, ai: 0.26 },
  { label: "35", human: 0.39, ai: 0.49 },
];

const outcomeBins: PMFBin[] = [
  { label: "Success", human: 0.35, ai: 0.48 },
  { label: "Failure", human: 0.65, ai: 0.52 },
];

const panels: { title: string; subtitle?: string; bins: PMFBin[] }[] = [
  { title: "All Rounds", subtitle: "Aggregate", bins: overallBins },
  { title: "Round 1", subtitle: "No prior history", bins: round1Bins },
  { title: "Avg. Reward", subtitle: "Per-round payoff", bins: avgRewardBins },
  { title: "Max Reward", subtitle: "Best single round", bins: maxRewardBins },
  { title: "Hunt Outcome", subtitle: "Success rate", bins: outcomeBins },
];

export function StagHuntDistributionView() {
  return (
    <div className="px-10 pb-10 flex flex-col gap-5">
      {/* Chart grid */}
      <div className="grid grid-cols-5 gap-px" style={{ backgroundColor: "var(--gt-border)" }}>
        {panels.map(({ title, subtitle, bins }) => (
          <div key={title} className="p-4" style={{ background: "var(--gt-surface)" }}>
            <PMFChart title={title} subtitle={subtitle} bins={bins} aiColor={AI_COLOR} />
          </div>
        ))}
      </div>

      {/* Source attribution */}
      <div className="flex items-center gap-3">
        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "var(--gt-border-md)" }} />
        <span className="font-[IBMPlexMono,monospace] text-[10px] tracking-[0.06em]" style={{ color: "var(--gt-t4)" }}>
          Human: Battalio, Samuelson &amp; Van Huyck (2001) · n≈84 · directional reference
        </span>
        <span className="w-px h-3 shrink-0" style={{ background: "var(--gt-border-md)" }} />
        <span className="font-[IBMPlexMono,monospace] text-[10px] tracking-[0.06em]" style={{ color: "var(--gt-t4)" }}>
          AI: atypica.AI personas · mock data
        </span>
      </div>
    </div>
  );
}
