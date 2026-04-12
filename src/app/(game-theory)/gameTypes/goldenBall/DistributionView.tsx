"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsData } from "../../lib/stats/types";
import { AI_COLOR, AiHumanLegend, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, pctLabelFmt, SourceAttribution } from "../AcademicChart";

const mockData = [
  { round: "R1", human: 0.55, ai: 0.70 },
  { round: "R2", human: 0.49, ai: 0.62 },
  { round: "R3", human: 0.43, ai: 0.56 },
];

function toChartData(agg?: StatsData) {
  if (!agg) return mockData;
  return agg.rows.map((r) => ({ round: r.label, human: r.values.human ?? 0, ai: r.values.ai ?? 0 }));
}

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function GoldenBallDistributionView({ aggregateData }: { aggregateData?: StatsData }) {
  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Split Rate by Round"
        subtitle="Does cooperation erode as the game progresses? AI personas vs human baseline."
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={toChartData(aggregateData)} margin={{ top: 20, right: 16, bottom: 8, left: 28 }} barCategoryGap="32%" barGap={4}>
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
        "Human: van den Assem, van Dolder & Thaler (2012) · MS 58(1) · directional reference",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
