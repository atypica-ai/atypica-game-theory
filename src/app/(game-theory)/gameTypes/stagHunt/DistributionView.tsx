"use client";

import { PMFBin, PMFChart } from "@/app/(game-theory)/(page)/HomeView/PMFChart";

const AI_COLOR = "#d97706";

// ── Human reference data ───────────────────────────────────────────────────────
// Source: Battalio, Samuelson & Van Huyck (2001) — "Optimization Incentives and
// Coordination Failure in Laboratory Stag Hunt Games" — approximate values.
// NOTE: our free-rider variant differs from classic stag hunt; these are directional
// references only. n≈84, 3 rounds.

// ── AI persona data ────────────────────────────────────────────────────────────
// Source: atypica.AI mock — TODO replace with live aggregation from game sessions
// AI personas begin optimistic (high stag), adapt faster to free-rider equilibrium.

const overallBins: PMFBin[] = [
  { label: "Stag", human: 0.38, ai: 0.52 },
  { label: "Rabbit", human: 0.62, ai: 0.48 },
];

const round1Bins: PMFBin[] = [
  { label: "Stag", human: 0.52, ai: 0.68 },
  { label: "Rabbit", human: 0.48, ai: 0.32 },
];

const round2Bins: PMFBin[] = [
  { label: "Stag", human: 0.37, ai: 0.50 },
  { label: "Rabbit", human: 0.63, ai: 0.50 },
];

const round3Bins: PMFBin[] = [
  { label: "Stag", human: 0.30, ai: 0.42 },
  { label: "Rabbit", human: 0.70, ai: 0.58 },
];

const outcomeBins: PMFBin[] = [
  { label: "Success", human: 0.35, ai: 0.48 },
  { label: "Failure", human: 0.65, ai: 0.52 },
];

const panels: { title: string; subtitle?: string; bins: PMFBin[] }[] = [
  { title: "Overall", subtitle: "All Rounds", bins: overallBins },
  { title: "Round 1", bins: round1Bins },
  { title: "Round 2", bins: round2Bins },
  { title: "Round 3", bins: round3Bins },
  { title: "Hunt Outcome", subtitle: "Success Rate", bins: outcomeBins },
];

export function StagHuntDistributionView() {
  return (
    <div className="p-8 flex flex-col gap-5">
      {/* Chart grid */}
      <div className="grid grid-cols-5 gap-px bg-zinc-800">
        {panels.map(({ title, subtitle, bins }) => (
          <div key={title} className="bg-[#09090b] p-5">
            <PMFChart title={title} subtitle={subtitle} bins={bins} aiColor={AI_COLOR} />
          </div>
        ))}
      </div>

      {/* Source attribution */}
      <div className="flex items-center gap-3">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 shrink-0" />
        <span className="font-IBMPlexMono text-[7px] tracking-[0.1em] uppercase text-zinc-700">
          Human: Battalio, Samuelson &amp; Van Huyck (2001) · n≈84 · directional reference
        </span>
        <span className="w-px h-3 bg-zinc-800 shrink-0" />
        <span className="font-IBMPlexMono text-[7px] tracking-[0.1em] uppercase text-zinc-700">
          AI: atypica.AI personas · mock data
        </span>
      </div>
    </div>
  );
}
