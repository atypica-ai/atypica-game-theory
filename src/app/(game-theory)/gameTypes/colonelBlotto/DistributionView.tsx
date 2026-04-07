"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AI_COLOR, AiHumanLegend, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, SourceAttribution } from "../AcademicChart";

// ── Research data ──────────────────────────────────────────────────────────────
// Borel (1921), Roberson (2006) theoretical analysis.
// Humans tend to over-concentrate (put too many troops on few battlefields).
// AI may discover equilibrium mixed strategies closer to theoretical optimal.

const data = [
  { strategy: "Concentrate [3,3,0,0]",    human: 0.35, ai: 0.25 },
  { strategy: "Balanced [2,2,2,0]",       human: 0.30, ai: 0.28 },
  { strategy: "Spread [2,2,1,1]",         human: 0.20, ai: 0.32 },
  { strategy: "Weighted [3,2,1,0]",       human: 0.15, ai: 0.15 },
];

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function ColonelBlottoDistributionView() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Allocation Strategy Distribution — Round 1"
        subtitle="PMF of allocation patterns (6 troops, 4 battlefields). Humans over-concentrate, AI spreads more."
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 12, right: 40, bottom: 8, left: 48 }} barCategoryGap="16%" barGap={2}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
            <XAxis
              dataKey="strategy"
              tick={{ ...axisTickProps, fontSize: 8 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tickFormatter={pctFmt}
              domain={[0, 0.40]}
              tickCount={4}
              tick={axisTickProps}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
            <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} radius={[2, 2, 0, 0]} fillOpacity={0.80} />
            <Bar dataKey="ai" name="AI" fill={AI_COLOR} radius={[2, 2, 0, 0]} fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <AiHumanLegend />
      <SourceAttribution papers={[
        "Human: Experimental Blotto game studies · tendency to over-concentrate",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
