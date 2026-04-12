"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GameSessionStats, PersonaDecisionEvent } from "../../types";
import type { StatsData } from "../../lib/stats/types";
import { AI_COLOR, AiHumanLegend, AXIS_COLOR, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, SourceAttribution, TICK_FONT } from "../AcademicChart";

const mockData = [
  { bin: "0–9",   human: 0.05, ai: 0.12 },
  { bin: "10–19", human: 0.15, ai: 0.32 },
  { bin: "20–29", human: 0.38, ai: 0.31 },
  { bin: "30–39", human: 0.28, ai: 0.16 },
  { bin: "40–49", human: 0.08, ai: 0.06 },
  { bin: "50–59", human: 0.04, ai: 0.02 },
  { bin: "60–69", human: 0.01, ai: 0.01 },
  { bin: "70–79", human: 0.01, ai: 0.00 },
  { bin: "80–89", human: 0.00, ai: 0.00 },
  { bin: "90–100",human: 0.00, ai: 0.00 },
];

function toChartData(agg?: StatsData) {
  if (!agg) return mockData;
  return agg.rows.map((r) => ({ bin: r.label, human: r.values.human ?? 0, ai: r.values.ai ?? 0 }));
}

// ── Session overlay helpers ────────────────────────────────────────────────────

function getR1WinningChoice(events: GameSessionStats["events"]): number | null {
  const r1 = events.filter(
    (e): e is PersonaDecisionEvent => e.type === "persona-decision" && e.round === 1,
  );
  if (r1.length === 0) return null;
  const choices = r1.map((d) => (d.content as { number: number }).number);
  const target = (2 / 3) * (choices.reduce((a, b) => a + b, 0) / choices.length);
  return choices.reduce((best, c) =>
    Math.abs(c - target) < Math.abs(best - target) ? c : best,
  );
}

function getBinLabel(n: number): string {
  const low = Math.floor(n / 10) * 10;
  return low >= 90 ? "90–100" : `${low}–${low + 9}`;
}

const SESSION_COLOR = "hsl(45 90% 52%)";

// ── Winning choice badge — rendered as SVG via recharts label content ──────────
type ViewBox = { x: number; y: number; width: number; height: number };

function WinningBadge({ viewBox, choice }: { viewBox?: ViewBox; choice: number }) {
  if (!viewBox) return null;
  const cx = viewBox.x;
  const text = `This game · ${choice}`;
  const badgeW = 96;
  const badgeH = 20;
  const bx = cx - badgeW / 2;
  const by = viewBox.y - badgeH - 5;
  return (
    <g>
      <rect x={bx} y={by} width={badgeW} height={badgeH} rx={5} fill={SESSION_COLOR} />
      <text
        x={cx}
        y={by + badgeH / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fontFamily={TICK_FONT}
        fill="hsl(25 20% 12%)"
        fontWeight="600"
      >
        {text}
      </text>
    </g>
  );
}

// ── Chart ──────────────────────────────────────────────────────────────────────

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function BeautyContestDistributionView({
  sessionStats,
  aggregateData,
}: {
  sessionStats?: GameSessionStats;
  aggregateData?: StatsData;
}) {
  const chartData = toChartData(aggregateData);
  const winningChoice = sessionStats ? getR1WinningChoice(sessionStats.events) : null;
  const winningBin = winningChoice !== null ? getBinLabel(winningChoice) : null;

  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Winning Choice Distribution — Round 1"
        subtitle="PMF of round-winning guesses (closest to ⅔ × mean). Lower choices signal deeper strategic reasoning."
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 32, right: 40, bottom: 8, left: 28 }} barCategoryGap="16%" barGap={2}>
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
              domain={[0, 0.45]}
              tickCount={4}
              tick={axisTickProps}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
            {/* Level-k winner zone anchors */}
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
            {/* This game's winning choice — amber line + pill badge */}
            {winningBin !== null && winningChoice !== null && (
              <ReferenceLine
                x={winningBin}
                stroke={SESSION_COLOR}
                strokeWidth={2}
                label={<WinningBadge choice={winningChoice} />}
              />
            )}
            {/* Human bars — dim all bins except the winning one when session data is present */}
            <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} radius={[2, 2, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.bin}
                  fillOpacity={winningBin === null || entry.bin === winningBin ? 0.80 : 0.18}
                />
              ))}
            </Bar>
            {/* AI bars — same dimming */}
            <Bar dataKey="ai" name="AI" fill={AI_COLOR} radius={[2, 2, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.bin}
                  fillOpacity={winningBin === null || entry.bin === winningBin ? 0.85 : 0.18}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <AiHumanLegend />
      <SourceAttribution papers={[
        "Human: Nagel (1995) · AER 85(5) · p = 2/3 · R1 · N≈69 · winning-choice PMF derived",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
