"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AI_COLOR, AiHumanLegend, AXIS_COLOR, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, SourceAttribution, TICK_FONT } from "../AcademicChart";

// ── Human reference data ───────────────────────────────────────────────────────
// Nagel (1995) AER — p-beauty contest (p = 2/3), Round 1 guess distribution
// Bins of width 10, N≈69; reconstructed from Figure 1 and table values.
// Modal bin: [30,40) ~19% (L1 anchor = 33)
// Secondary: [20,30) ~16% (L2 anchor = 22)
// Shoulder: [50,60) ~14% (L0 anchor = 50)

// ── AI data ────────────────────────────────────────────────────────────────────
// Source: accumulated game sessions from atypica.AI personas, R1
// TODO: replace with live aggregation from PersonaDecisionEvent {number} field

const data = [
  { bin: "0–9",   human: 0.05, ai: 0.02 },
  { bin: "10–19", human: 0.08, ai: 0.04 },
  { bin: "20–29", human: 0.16, ai: 0.14 },
  { bin: "30–39", human: 0.19, ai: 0.22 },
  { bin: "40–49", human: 0.11, ai: 0.18 },
  { bin: "50–59", human: 0.14, ai: 0.11 },
  { bin: "60–69", human: 0.09, ai: 0.12 },
  { bin: "70–79", human: 0.07, ai: 0.08 },
  { bin: "80–89", human: 0.06, ai: 0.05 },
  { bin: "90–100",human: 0.05, ai: 0.04 },
];

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function BeautyContestDistributionView() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Guess Distribution — Round 1"
        subtitle="PMF of integer guesses (0–100, p = 2/3 rule). AI personas cluster closer to Nash equilibrium."
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 20, right: 40, bottom: 8, left: 28 }} barCategoryGap="16%" barGap={2}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
            <XAxis
              dataKey="bin"
              tick={{ ...axisTickProps, fontSize: 8 }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tickFormatter={pctFmt}
              domain={[0, 0.30]}
              tickCount={4}
              tick={axisTickProps}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
            {/* Level-k anchors */}
            <ReferenceLine
              x="30–39"
              stroke={AXIS_COLOR}
              strokeWidth={1}
              strokeDasharray="4 3"
              label={{ value: "L1=33", position: "top", fontSize: 8, fontFamily: TICK_FONT, fill: AXIS_COLOR, dy: -4 }}
            />
            <ReferenceLine
              x="20–29"
              stroke={AXIS_COLOR}
              strokeWidth={1}
              strokeDasharray="4 3"
              label={{ value: "L2=22", position: "insideTopLeft", fontSize: 8, fontFamily: TICK_FONT, fill: AXIS_COLOR, dy: -4 }}
            />
            <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} fillOpacity={0.80} radius={[2, 2, 0, 0]} />
            <Bar dataKey="ai"    name="AI"    fill={AI_COLOR}    fillOpacity={0.85} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <AiHumanLegend />
      <SourceAttribution papers={[
        "Human: Nagel (1995) · AER 85(5) · p = 2/3 · R1 · N≈69 · reconstructed",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
