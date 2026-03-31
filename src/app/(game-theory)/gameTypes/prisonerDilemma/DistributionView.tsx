"use client";

import { PMFBin, PMFChart } from "@/app/(game-theory)/(page)/HomeView/PMFChart";

const AI_COLOR = "hsl(208 77% 52%)"; // --gt-blue

// ── Human reference data ───────────────────────────────────────────────────────
// Source: Dal Bó & Fréchette (2011) — "The Evolution of Cooperation in Infinitely
// Repeated Games: Experimental Evidence"
// Treatment: Easy (R=51, T=63, S=22, P=39), 4 fixed rounds, n=358
// Cooperation rates approximated from Table 3 / Figure 2 of the paper.

// ── AI persona data ────────────────────────────────────────────────────────────
// Source: atypica.AI mock — TODO replace with live aggregation from game sessions
// AI personas show higher initial cooperation with a slower defection cascade.

const overallBins: PMFBin[] = [
  { label: "Cooperate", human: 0.47, ai: 0.58 },
  { label: "Defect", human: 0.53, ai: 0.42 },
];

const round1Bins: PMFBin[] = [
  { label: "Cooperate", human: 0.62, ai: 0.76 },
  { label: "Defect", human: 0.38, ai: 0.24 },
];

const round2Bins: PMFBin[] = [
  { label: "Cooperate", human: 0.52, ai: 0.63 },
  { label: "Defect", human: 0.48, ai: 0.37 },
];

const round3Bins: PMFBin[] = [
  { label: "Cooperate", human: 0.43, ai: 0.52 },
  { label: "Defect", human: 0.57, ai: 0.48 },
];

const round4Bins: PMFBin[] = [
  { label: "Cooperate", human: 0.34, ai: 0.44 },
  { label: "Defect", human: 0.66, ai: 0.56 },
];

const panels: { title: string; subtitle?: string; bins: PMFBin[] }[] = [
  { title: "All Rounds", subtitle: "Aggregate", bins: overallBins },
  { title: "Round 1", subtitle: "No prior history", bins: round1Bins },
  { title: "Round 2", subtitle: "After 1 round", bins: round2Bins },
  { title: "Round 3", subtitle: "After 2 rounds", bins: round3Bins },
  { title: "Round 4", subtitle: "Final round", bins: round4Bins },
];

export function PrisonerDilemmaDistributionView() {
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
          Human: Dal Bó &amp; Fréchette (2011) · Treatment E4 · n=358
        </span>
        <span className="w-px h-3 shrink-0" style={{ background: "var(--gt-border-md)" }} />
        <span className="font-[IBMPlexMono,monospace] text-[10px] tracking-[0.06em]" style={{ color: "var(--gt-t4)" }}>
          AI: atypica.AI personas · mock data
        </span>
      </div>
    </div>
  );
}
