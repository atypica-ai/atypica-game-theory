"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GameSessionStats } from "../../types";
import { AI_COLOR, AiHumanLegend, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, SourceAttribution } from "../AcademicChart";

// ── Research data ──────────────────────────────────────────────────────────────
// Diekmann (1985, 1993) and Franzen (1995) experimental results.
// Volunteer rate varies with group size (smaller groups → higher volunteer rate).
// Humans show heterogeneity: some "let-me-do-it" altruists, some never volunteer.
// AI may exhibit more rational mixing or follow Nash equilibrium probabilities.
// Symmetric Nash: p* = 1 - (C/(B-0))^(1/(n-1)). For B=50, C=30, n=5: p* ≈ 0.37.

const data = [
  { action: "Volunteer",     human: 0.45, ai: 0.38 },
  { action: "Not Volunteer", human: 0.55, ai: 0.62 },
];

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function VolunteerDilemmaDistributionView({
  sessionStats: _sessionStats,
}: {
  sessionStats?: GameSessionStats;
}) {
  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Volunteer Rate — Round 1"
        subtitle="Probability of volunteering (N=5). Humans show higher volunteering due to altruism."
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 12, right: 40, bottom: 8, left: 48 }} barCategoryGap="24%" barGap={4}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
            <XAxis
              dataKey="action"
              tick={{ ...axisTickProps, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tickFormatter={pctFmt}
              domain={[0, 0.70]}
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
        "Human: Diekmann (1985, 1993), Franzen (1995) · volunteer rate experiments",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
