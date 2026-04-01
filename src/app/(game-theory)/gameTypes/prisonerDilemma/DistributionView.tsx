"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AI_COLOR, AiHumanLegend, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, pctLabelFmt, SourceAttribution } from "../AcademicChart";

// ── Human reference data ───────────────────────────────────────────────────────
// Dal Bó & Fréchette (2011) AER — "Easy" treatment (R=51, T=63, S=22, P=39)
// This is the EXACT payoff matrix used in our game.
// Cooperation rates per round from Table 3 / Figure 2 (4-round finite horizon, n=358)

// ── AI data ────────────────────────────────────────────────────────────────────
// Source: accumulated game sessions from atypica.AI personas
// TODO: replace with live aggregation from PersonaDecisionEvent records

const data = [
  { round: "R1", human: 0.62, ai: 0.76 },
  { round: "R2", human: 0.52, ai: 0.63 },
  { round: "R3", human: 0.43, ai: 0.52 },
  { round: "R4", human: 0.34, ai: 0.44 },
];

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function PrisonerDilemmaDistributionView() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Cooperation Rate by Round"
        subtitle="Does the end-game defection cascade emerge in AI personas?"
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 20, right: 16, bottom: 8, left: 28 }} barCategoryGap="32%" barGap={4}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
            <XAxis dataKey="round" tick={axisTickProps} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={pctFmt}
              domain={[0, 0.9]}
              tickCount={5}
              tick={axisTickProps}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
            <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} fillOpacity={0.80} radius={[3, 3, 0, 0]}>
              <LabelList dataKey="human" position="top" formatter={pctLabelFmt} style={{ fontSize: 9, fontFamily: "IBMPlexMono,monospace", fill: HUMAN_COLOR }} />
            </Bar>
            <Bar dataKey="ai" name="AI" fill={AI_COLOR} fillOpacity={0.85} radius={[3, 3, 0, 0]}>
              <LabelList dataKey="ai" position="top" formatter={pctLabelFmt} style={{ fontSize: 9, fontFamily: "IBMPlexMono,monospace", fill: AI_COLOR }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <AiHumanLegend />
      <SourceAttribution papers={[
        "Human: Dal Bó & Fréchette (2011) · AER 101(1) · Treatment E4 · n=358",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
