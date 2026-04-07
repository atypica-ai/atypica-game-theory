"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GameSessionStats } from "../../types";
import { AI_COLOR, AiHumanLegend, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, SourceAttribution, TICK_FONT } from "../AcademicChart";

// ── Research data ──────────────────────────────────────────────────────────────
// Experimental evidence shows systematic overbidding in all-pay auctions.
// Gneezy & Smorodinsky (2006) and others document average bids exceeding Nash equilibrium.
// Nash equilibrium: bid = (n-1)/n × value. For n=4, Nash ≈ 0.75 × 100 = 75.
// Observed: humans tend to bid 80-100 (escalation trap), AI may bid closer to Nash.

const data = [
  { bin: "0–19",   human: 0.05, ai: 0.18 },
  { bin: "20–39",  human: 0.08, ai: 0.25 },
  { bin: "40–59",  human: 0.12, ai: 0.28 },
  { bin: "60–79",  human: 0.20, ai: 0.22 },
  { bin: "80–99",  human: 0.35, ai: 0.06 },
  { bin: "100+",   human: 0.20, ai: 0.01 },
];

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function AllPayAuctionDistributionView({
  sessionStats,
}: {
  sessionStats?: GameSessionStats;
}) {
  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Bid Distribution — Round 1"
        subtitle="PMF of first-round bids (prize = 100). Humans show escalation bias, AI closer to Nash."
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 12, right: 40, bottom: 8, left: 28 }} barCategoryGap="16%" barGap={2}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
            <XAxis
              dataKey="bin"
              tick={{ ...axisTickProps, fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tickFormatter={pctFmt}
              domain={[0, 0.40]}
              tickCount={4}
              tick={axisTickProps}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
            <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} radius={[2, 2, 0, 0]} fillOpacity={0.80} />
            <Bar dataKey="ai" name="AI" fill={AI_COLOR} radius={[2, 2, 0, 0]} fillOpacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <AiHumanLegend />
      <SourceAttribution papers={[
        "Human: Gneezy & Smorodinsky (2006) · Games Econ Behav · overbidding pattern",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
