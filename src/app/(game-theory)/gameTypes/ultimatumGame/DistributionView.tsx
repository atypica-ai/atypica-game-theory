"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsData } from "../../lib/stats/types";
import { AI_COLOR, AiHumanLegend, axisTickProps, ChartPanel, GRID_COLOR, HUMAN_COLOR, makeTooltip, pctLabelFmt, SourceAttribution } from "../AcademicChart";

// ── Mock fallback (used when no GameStats row exists yet) ─────────────────────
// Bins = offer to responder. Left = greedy, right = generous.

const MOCK_OFFER = [
  { bin: "0–19%",  human: 0.12, ai: 0.09 },
  { bin: "20–29%", human: 0.05, ai: 0.06 },
  { bin: "30–39%", human: 0.08, ai: 0.24 },
  { bin: "40–49%", human: 0.25, ai: 0.38 },
  { bin: "50%+",   human: 0.50, ai: 0.23 },
];

const MOCK_REJECT = [
  { bin: "0–19%",  human: 0.53, ai: 0.28 },
  { bin: "20–29%", human: 0.45, ai: 0.18 },
  { bin: "30–39%", human: 0.21, ai: 0.07 },
  { bin: "40–49%", human: 0.08, ai: 0.03 },
  { bin: "50%+",   human: 0.03, ai: 0.01 },
];

function toOfferData(agg?: StatsData) {
  if (!agg) return MOCK_OFFER;
  return agg.rows.map((r) => ({
    bin: r.label,
    human: r.values.human_offer ?? 0,
    ai:    r.values.ai_offer    ?? 0,
  }));
}

function toRejectData(agg?: StatsData) {
  if (!agg) return MOCK_REJECT;
  return agg.rows.map((r) => ({
    bin: r.label,
    human: r.values.human_reject ?? 0,
    ai:    r.values.ai_reject    ?? 0,
  }));
}

const pctFmt = (v: number) => `${Math.round(v * 100)}%`;
const TooltipContent = makeTooltip(pctFmt);

export function UltimatumGameDistributionView({ aggregateData }: { aggregateData?: StatsData }) {
  return (
    <div className="p-6 flex flex-col gap-8">

      {/* ── Panel 1: Proposer generosity ──────────────────────────────────── */}
      <ChartPanel
        title="When Holding the Power — What Did AI Offer?"
        subtitle="Over 50% of humans split evenly despite zero obligation. Does AI internalize fairness, or calculate it?"
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={toOfferData(aggregateData)} margin={{ top: 20, right: 16, bottom: 8, left: 28 }} barCategoryGap="32%" barGap={4}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
            <XAxis dataKey="bin" tick={axisTickProps} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={pctFmt} domain={[0, 0.65]} tickCount={5} tick={axisTickProps} axisLine={false} tickLine={false} width={30} />
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

      {/* ── Panel 2: Responder rejection (emotion vs. rationality) ─────────── */}
      <ChartPanel
        title="Does AI Have Pride? Rejection Rate by Offer Received"
        subtitle="53% of humans reject near-zero offers — burning their own money to punish unfairness. Does AI feel the same?"
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={toRejectData(aggregateData)} margin={{ top: 20, right: 16, bottom: 8, left: 28 }} barCategoryGap="32%" barGap={4}>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
            <XAxis dataKey="bin" tick={axisTickProps} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={pctFmt} domain={[0, 0.7]} tickCount={5} tick={axisTickProps} axisLine={false} tickLine={false} width={30} />
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
        "Human offers: Andreoni, Castillo & Petrie (2003) · AER 93(3) · n≈200 pairs",
        "Human rejection: Yamagishi et al. (2012) · PNAS 109(52)",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
