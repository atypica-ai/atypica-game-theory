"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsData } from "../../lib/stats/types";
import { AI_COLOR, AiHumanLegend, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, pctLabelFmt, SourceAttribution } from "../AcademicChart";

// Bins = offer to responder (what proposer gives away). Left = greedy, right = generous.
const mockData = [
  { bin: "0–19%",  human: 0.05, ai: 0.08 },
  { bin: "20–29%", human: 0.08, ai: 0.14 },
  { bin: "30–39%", human: 0.15, ai: 0.32 },
  { bin: "40–49%", human: 0.35, ai: 0.34 },
  { bin: "50%+",   human: 0.37, ai: 0.12 },
];

function toChartData(agg?: StatsData) {
  if (!agg) return mockData;
  return agg.rows.map((r) => ({ bin: r.label, human: r.values.human ?? 0, ai: r.values.ai ?? 0 }));
}

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function UltimatumGameDistributionView({ aggregateData }: { aggregateData?: StatsData }) {
  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Does AI Play Fair or Play Smart?"
        subtitle="Offer to responder — game theory says keep everything, humans give away half. AI personas?"
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={toChartData(aggregateData)} margin={{ top: 20, right: 16, bottom: 8, left: 28 }} barCategoryGap="32%" barGap={4}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
            <XAxis dataKey="bin" tick={axisTickProps} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={pctFmt}
              domain={[0, 0.6]}
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
        "Human: Güth, Schmittberger & Schwarze (1982) · JEBO 3(4) · n=42 pairs",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
