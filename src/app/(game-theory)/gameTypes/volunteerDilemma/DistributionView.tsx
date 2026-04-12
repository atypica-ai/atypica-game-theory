"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GameSessionStats, PersonaDecisionEvent } from "../../types";
import type { StatsData } from "../../lib/stats/types";
import { AI_COLOR, AiHumanLegend, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, SourceAttribution, TICK_FONT } from "../AcademicChart";

const mockData = [
  { action: "Volunteer",     human: 0.45, ai: 0.38 },
  { action: "Not Volunteer", human: 0.55, ai: 0.62 },
];

function toChartData(agg?: StatsData) {
  if (!agg) return mockData;
  return agg.rows.map((r) => ({ action: r.label, human: r.values.human ?? 0, ai: r.values.ai ?? 0 }));
}

function getR1VolunteerRate(events: GameSessionStats["events"]): number | null {
  const r1 = events.filter(
    (e): e is PersonaDecisionEvent => e.type === "persona-decision" && e.round === 1,
  );
  if (r1.length === 0) return null;
  const volunteers = r1.filter((d) => (d.content as { action: string }).action === "volunteer").length;
  return volunteers / r1.length;
}

const SESSION_COLOR = "hsl(45 90% 52%)";

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function VolunteerDilemmaDistributionView({
  sessionStats,
  aggregateData,
}: {
  sessionStats?: GameSessionStats;
  aggregateData?: StatsData;
}) {
  const chartData = toChartData(aggregateData);
  const volunteerRate = sessionStats ? getR1VolunteerRate(sessionStats.events) : null;
  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Volunteer Rate — Round 1"
        subtitle="Probability of volunteering (N=5). Humans show higher volunteering due to altruism."
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 12, right: 40, bottom: 8, left: 48 }} barCategoryGap="24%" barGap={4}>
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
            {volunteerRate !== null && (
              <ReferenceLine
                y={volunteerRate}
                stroke={SESSION_COLOR}
                strokeWidth={2}
                strokeDasharray="5 3"
                label={{
                  value: `This game · ${Math.round(volunteerRate * 100)}%`,
                  position: "right",
                  fontSize: 9,
                  fontFamily: TICK_FONT,
                  fill: SESSION_COLOR,
                  dx: 10,
                }}
              />
            )}
            <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} radius={[2, 2, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.action}
                  fillOpacity={volunteerRate === null ? 0.80 : 0.50}
                />
              ))}
            </Bar>
            <Bar dataKey="ai" name="AI" fill={AI_COLOR} radius={[2, 2, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.action}
                  fillOpacity={volunteerRate === null ? 0.85 : 0.50}
                />
              ))}
            </Bar>
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
