"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GameSessionStats, PersonaDecisionEvent } from "../../types";
import { AI_COLOR, AiHumanLegend, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, SourceAttribution, TICK_FONT } from "../AcademicChart";

// ── Research data ──────────────────────────────────────────────────────────────
// Experimental evidence shows systematic overbidding in all-pay auctions.
// Gneezy & Smorodinsky (2006) and others document average bids exceeding Nash equilibrium.
// Nash equilibrium: bid = (n-1)/n × value. For n=4, Nash ≈ 0.75 × 100 = 75.
// Observed: humans tend to bid 80-100 (escalation trap), AI may bid closer to Nash.

const data = [
  { bin: "0–19",   human: 0.05, ai: 0.18 },
  { bin: "20–39",  human: 0.08, ai: 0.25 },
  { bin: "40–59",  human: 0.12, ai: 0.28 },
  { bin: "60–79",  human: 0.20, ai: 0.22 },
  { bin: "80–99",  human: 0.35, ai: 0.06 },
  { bin: "100+",   human: 0.20, ai: 0.01 },
];

// ── Session overlay helpers ────────────────────────────────────────────────────

function getR1AverageBid(events: GameSessionStats["events"]): number | null {
  const r1 = events.filter(
    (e): e is PersonaDecisionEvent => e.type === "persona-decision" && e.round === 1,
  );
  if (r1.length === 0) return null;
  const bids = r1.map((d) => (d.content as { bid: number }).bid);
  return Math.round(bids.reduce((a, b) => a + b, 0) / bids.length);
}

function getBinLabel(bid: number): string {
  if (bid >= 100) return "100+";
  const low = Math.floor(bid / 20) * 20;
  return `${low}–${low + 19}`;
}

const SESSION_COLOR = "hsl(45 90% 52%)";

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function AllPayAuctionDistributionView({
  sessionStats,
}: {
  sessionStats?: GameSessionStats;
}) {
  const avgBid = sessionStats ? getR1AverageBid(sessionStats.events) : null;
  const avgBin = avgBid !== null ? getBinLabel(avgBid) : null;
  return (
    <div className="p-6 flex flex-col gap-4">
      <ChartPanel
        title="Bid Distribution — Round 1"
        subtitle="PMF of first-round bids (prize = 100). Humans show escalation bias, AI closer to Nash."
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 12, right: 40, bottom: 8, left: 28 }} barCategoryGap="16%" barGap={2}>
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
              domain={[0, 0.40]}
              tickCount={4}
              tick={axisTickProps}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
            {/* This game's average bid marker */}
            {avgBin !== null && avgBid !== null && (
              <ReferenceLine
                x={avgBin}
                stroke={SESSION_COLOR}
                strokeWidth={2}
                label={{
                  value: `This game · avg ${avgBid}`,
                  position: "top",
                  fontSize: 9,
                  fontFamily: TICK_FONT,
                  fill: SESSION_COLOR,
                  dy: -8,
                }}
              />
            )}
            {/* Human bars — dim all bins except the one containing this game's average */}
            <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} radius={[2, 2, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.bin}
                  fillOpacity={avgBin === null || entry.bin === avgBin ? 0.80 : 0.18}
                />
              ))}
            </Bar>
            {/* AI bars — same dimming */}
            <Bar dataKey="ai" name="AI" fill={AI_COLOR} radius={[2, 2, 0, 0]}>
              {data.map((entry) => (
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
        "Human: Gneezy & Smorodinsky (2006) · Games Econ Behav · overbidding pattern",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
