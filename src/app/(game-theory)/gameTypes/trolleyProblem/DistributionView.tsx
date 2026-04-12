"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GameSessionStats, PersonaDecisionEvent } from "../../types";
import type { StatsData } from "../../lib/stats/types";
import { AI_COLOR, AiHumanLegend, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, SourceAttribution, TICK_FONT } from "../AcademicChart";

const mockClassic = [
  { action: "Pull Lever", human: 0.75, ai: 0.85 },
  { action: "Do Nothing", human: 0.25, ai: 0.15 },
];

const mockFatMan = [
  { action: "Push Man", human: 0.15, ai: 0.60 },
  { action: "Do Nothing", human: 0.85, ai: 0.40 },
];

function toChartData(agg?: StatsData): { classic: typeof mockClassic; fatMan: typeof mockFatMan } {
  if (!agg) return { classic: mockClassic, fatMan: mockFatMan };
  const classic = agg.rows
    .filter((r) => r.label.startsWith("Classic:"))
    .map((r) => ({ action: r.label.replace("Classic: ", ""), human: r.values.human ?? 0, ai: r.values.ai ?? 0 }));
  const fatMan = agg.rows
    .filter((r) => r.label.startsWith("Fat Man:"))
    .map((r) => ({ action: r.label.replace("Fat Man: ", ""), human: r.values.human ?? 0, ai: r.values.ai ?? 0 }));
  return {
    classic: classic.length > 0 ? classic : mockClassic,
    fatMan: fatMan.length > 0 ? fatMan : mockFatMan,
  };
}

function getVoteRates(events: GameSessionStats["events"]): {
  classicPull: number;
  fatManPush: number;
} | null {
  const decisions = events.filter(
    (e): e is PersonaDecisionEvent => e.type === "persona-decision",
  );
  if (decisions.length === 0) return null;

  const classicPull = decisions.filter(
    (d) => (d.content as { classicScenario: string }).classicScenario === "pull_lever",
  ).length / decisions.length;

  const fatManPush = decisions.filter(
    (d) => (d.content as { fatManScenario: string }).fatManScenario === "push_man",
  ).length / decisions.length;

  return { classicPull, fatManPush };
}

const SESSION_COLOR = "hsl(45 90% 52%)";

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function TrolleyProblemDistributionView({
  sessionStats,
  aggregateData,
}: {
  sessionStats?: GameSessionStats;
  aggregateData?: StatsData;
}) {
  const { classic: dataClassic, fatMan: dataFatMan } = toChartData(aggregateData);
  const rates = sessionStats ? getVoteRates(sessionStats.events) : null;

  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Classic Trolley — Pull Lever or Do Nothing?"
        subtitle="Most pull lever (redirect threat). AI shows higher utilitarian rate."
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dataClassic} margin={{ top: 12, right: 40, bottom: 8, left: 48 }} barCategoryGap="24%" barGap={4}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
            <XAxis
              dataKey="action"
              tick={{ ...axisTickProps, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={pctFmt}
              domain={[0, 1.0]}
              tickCount={4}
              tick={axisTickProps}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
            {rates && (
              <ReferenceLine
                y={rates.classicPull}
                stroke={SESSION_COLOR}
                strokeWidth={2}
                strokeDasharray="5 3"
                label={{
                  value: `This game · ${Math.round(rates.classicPull * 100)}%`,
                  position: "right",
                  fontSize: 9,
                  fontFamily: TICK_FONT,
                  fill: SESSION_COLOR,
                }}
              />
            )}
            <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} radius={[2, 2, 0, 0]}>
              {dataClassic.map((entry) => (
                <Cell key={entry.action} fillOpacity={rates === null ? 0.80 : 0.50} />
              ))}
            </Bar>
            <Bar dataKey="ai" name="AI" fill={AI_COLOR} radius={[2, 2, 0, 0]}>
              {dataClassic.map((entry) => (
                <Cell key={entry.action} fillOpacity={rates === null ? 0.85 : 0.50} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel
        title="Fat Man Variant — Push or Do Nothing?"
        subtitle="Most refuse to push (active killing). AI shows much higher utilitarian rate."
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dataFatMan} margin={{ top: 12, right: 40, bottom: 8, left: 48 }} barCategoryGap="24%" barGap={4}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
            <XAxis
              dataKey="action"
              tick={{ ...axisTickProps, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={pctFmt}
              domain={[0, 1.0]}
              tickCount={4}
              tick={axisTickProps}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
            {rates && (
              <ReferenceLine
                y={rates.fatManPush}
                stroke={SESSION_COLOR}
                strokeWidth={2}
                strokeDasharray="5 3"
                label={{
                  value: `This game · ${Math.round(rates.fatManPush * 100)}%`,
                  position: "right",
                  fontSize: 9,
                  fontFamily: TICK_FONT,
                  fill: SESSION_COLOR,
                }}
              />
            )}
            <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} radius={[2, 2, 0, 0]}>
              {dataFatMan.map((entry) => (
                <Cell key={entry.action} fillOpacity={rates === null ? 0.80 : 0.50} />
              ))}
            </Bar>
            <Bar dataKey="ai" name="AI" fill={AI_COLOR} radius={[2, 2, 0, 0]}>
              {dataFatMan.map((entry) => (
                <Cell key={entry.action} fillOpacity={rates === null ? 0.85 : 0.50} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <AiHumanLegend />
      <SourceAttribution papers={[
        "Human: Thomson (1985) 'The Trolley Problem' · empirical moral psychology",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
