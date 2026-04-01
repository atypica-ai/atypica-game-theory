"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AI_COLOR, AiHumanLegend, AXIS_COLOR, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, SourceAttribution, TICK_FONT } from "../AcademicChart";

// ── Human reference data ───────────────────────────────────────────────────────
// Nagel (1995) AER — p-beauty contest (p = 2/3), mean group guess per round
// Subjects converge toward Nash equilibrium (= 0) but plateau well above it.
// Our game uses the same p = 2/3 rule and 3 rounds.

// ── AI data ────────────────────────────────────────────────────────────────────
// Source: accumulated game sessions from atypica.AI personas
// TODO: replace with live aggregation from PersonaDecisionEvent {number} field

const data = [
  { round: "R1", human: 37, ai: 22 },
  { round: "R2", human: 26, ai: 14 },
  { round: "R3", human: 20, ai: 10 },
];

const numFmt = (v: number) => String(Math.round(v));
const TooltipContent = makeTooltip(numFmt);

export function BeautyContestDistributionView() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Mean Guess by Round"
        subtitle="Convergence toward Nash equilibrium (target = 0). AI personas start closer and converge faster."
      >
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 16, right: 32, bottom: 8, left: 28 }}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
            <XAxis dataKey="round" tick={axisTickProps} axisLine={false} tickLine={false} />
            <YAxis
              domain={[0, 50]}
              tickCount={6}
              tick={axisTickProps}
              axisLine={false}
              tickLine={false}
              width={26}
            />
            <Tooltip content={<TooltipContent />} cursor={{ stroke: GRID_COLOR }} />
            {/* Nash equilibrium reference */}
            <ReferenceLine
              y={0}
              stroke={AXIS_COLOR}
              strokeWidth={1}
              strokeDasharray="5 3"
              label={{
                value: "Nash = 0",
                position: "right",
                fontSize: 8,
                fontFamily: TICK_FONT,
                fill: AXIS_COLOR,
              }}
            />
            <Line
              dataKey="human"
              name="Human"
              stroke={HUMAN_COLOR}
              strokeWidth={2}
              dot={{ r: 4, fill: HUMAN_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Line
              dataKey="ai"
              name="AI"
              stroke={AI_COLOR}
              strokeWidth={2}
              dot={{ r: 4, fill: AI_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>

      <AiHumanLegend />
      <SourceAttribution papers={[
        "Human: Nagel (1995) · AER 85(5): 1313–1326 · p = 2/3",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
