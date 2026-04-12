"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GameSessionStats, PersonaDecisionEvent } from "../../types";
import type { StatsData } from "../../lib/stats/types";
import { AI_COLOR, AiHumanLegend, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, SourceAttribution, TICK_FONT } from "../AcademicChart";

const mockData = [
  { bin: "0-4",    human: 0.25, ai: 0.45 },
  { bin: "5-9",    human: 0.20, ai: 0.28 },
  { bin: "10-14",  human: 0.25, ai: 0.18 },
  { bin: "15-19",  human: 0.20, ai: 0.07 },
  { bin: "20",     human: 0.10, ai: 0.02 },
];

function toChartData(agg?: StatsData) {
  if (!agg) return mockData;
  return agg.rows.map((r) => ({ bin: r.label, human: r.values.human ?? 0, ai: r.values.ai ?? 0 }));
}

// ── Session overlay helpers ────────────────────────────────────────────────────

function getR1AverageContribution(events: GameSessionStats["events"]): number | null {
  const r1 = events.filter(
    (e): e is PersonaDecisionEvent => e.type === "persona-decision" && e.round === 1,
  );
  if (r1.length === 0) return null;
  const contributions = r1.map((d) => (d.content as { contribution: number }).contribution);
  return Math.round(contributions.reduce((a, b) => a + b, 0) / contributions.length);
}

function getBinLabel(contribution: number): string {
  if (contribution === 20) return "20";
  if (contribution >= 15) return "15-19";
  if (contribution >= 10) return "10-14";
  if (contribution >= 5) return "5-9";
  return "0-4";
}

const SESSION_COLOR = "hsl(45 90% 52%)";

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function PublicGoodsDistributionView({
  sessionStats,
  aggregateData,
}: {
  sessionStats?: GameSessionStats;
  aggregateData?: StatsData;
}) {
  const chartData = toChartData(aggregateData);
  const avgContribution = sessionStats ? getR1AverageContribution(sessionStats.events) : null;
  const avgBin = avgContribution !== null ? getBinLabel(avgContribution) : null;

  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Contribution Distribution — Round 1"
        subtitle="PMF of contributions to public pool (endowment = 20). Humans show conditional cooperation, AI may defect more."
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 32, right: 40, bottom: 8, left: 28 }} barCategoryGap="16%" barGap={2}>
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
              domain={[0, 0.50]}
              tickCount={4}
              tick={axisTickProps}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
            {avgBin !== null && avgContribution !== null && (
              <ReferenceLine
                x={avgBin}
                stroke={SESSION_COLOR}
                strokeWidth={2}
                label={{
                  value: `This game · avg ${avgContribution}`,
                  position: "top",
                  fontSize: 9,
                  fontFamily: TICK_FONT,
                  fill: SESSION_COLOR,
                  dy: -8,
                }}
              />
            )}
            <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} radius={[2, 2, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.bin}
                  fillOpacity={avgBin === null || entry.bin === avgBin ? 0.80 : 0.18}
                />
              ))}
            </Bar>
            <Bar dataKey="ai" name="AI" fill={AI_COLOR} radius={[2, 2, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.bin}
                  fillOpacity={avgBin === null || entry.bin === avgBin ? 0.85 : 0.18}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <AiHumanLegend />
      <SourceAttribution papers={[
        "Human: Ledyard (1995) · JEL handbook · meta-analysis of public goods experiments",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
