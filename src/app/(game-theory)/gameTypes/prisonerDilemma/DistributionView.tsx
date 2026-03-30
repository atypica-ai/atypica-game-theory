"use client";

import { PMFBin, PMFChart } from "@/app/(game-theory)/(page)/HomeView/PMFChart";

const AI_COLOR = "#1bff1b";

// ── Human reference data ───────────────────────────────────────────────────────
// Source: Dal Bó & Fréchette (2011) — "The Evolution of Cooperation in Infinitely
// Repeated Games: Experimental Evidence"
// Treatment: Easy (R=51, T=63, S=22, P=39), 4 fixed rounds, n=358
// Cooperation rates approximated from Table 3 / Figure 2 of the paper.

// ── AI persona data ────────────────────────────────────────────────────────────
// Source: atypica.AI mock — TODO replace with live aggregation from game sessions
// AI personas tend toward higher initial cooperation, slower defection cascade.

const overallBins: PMFBin[] = [
  { label: "C", human: 0.47, ai: 0.58 },
  { label: "D", human: 0.53, ai: 0.42 },
];

const round1Bins: PMFBin[] = [
  { label: "C", human: 0.62, ai: 0.76 },
  { label: "D", human: 0.38, ai: 0.24 },
];

const round2Bins: PMFBin[] = [
  { label: "C", human: 0.52, ai: 0.63 },
  { label: "D", human: 0.48, ai: 0.37 },
];

const round3Bins: PMFBin[] = [
  { label: "C", human: 0.43, ai: 0.52 },
  { label: "D", human: 0.57, ai: 0.48 },
];

const round4Bins: PMFBin[] = [
  { label: "C", human: 0.34, ai: 0.44 },
  { label: "D", human: 0.66, ai: 0.56 },
];

const panels: { title: string; subtitle?: string; bins: PMFBin[] }[] = [
  { title: "Overall", subtitle: "All Rounds", bins: overallBins },
  { title: "Round 1", bins: round1Bins },
  { title: "Round 2", bins: round2Bins },
  { title: "Round 3", bins: round3Bins },
  { title: "Round 4", bins: round4Bins },
];

export function PrisonerDilemmaDistributionView() {
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
          Human: Dal Bó &amp; Fréchette (2011) · Treatment E4 · n=358
        </span>
        <span className="w-px h-3 bg-zinc-800 shrink-0" />
        <span className="font-IBMPlexMono text-[7px] tracking-[0.1em] uppercase text-zinc-700">
          AI: atypica.AI personas · mock data
        </span>
      </div>
    </div>
  );
}
