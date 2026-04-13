"use client";

import {
  Bar, BarChart, CartesianGrid, LabelList, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { StatsData } from "../../lib/stats/types";
import {
  AI_COLOR, AiHumanLegend, axisTickProps,
  GRID_COLOR, HUMAN_COLOR, SourceAttribution, TICK_FONT,
} from "../AcademicChart";

// ── Mock fallback ─────────────────────────────────────────────────────────────

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
    bin:   r.label,
    human: r.values.human_offer ?? 0,
    ai:    r.values.ai_offer    ?? 0,
  }));
}

function toRejectData(agg?: StatsData) {
  if (!agg) return MOCK_REJECT;
  return agg.rows.map((r) => ({
    bin:   r.label,
    human: r.values.human_reject ?? 0,
    ai:    r.values.ai_reject    ?? 0,
  }));
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const pctLabelFmt = (v: unknown) =>
  v == null || typeof v === "boolean" ? "" : `${Math.round(Number(v) * 100)}%`;

// Strip trailing "%" from bin labels (e.g. "0–19%" → "0–19", "50%+" → "50+")
// so the X-axis reads as plain numbers; context is given by the label below.
const stripPct = (v: string) => v.replace(/%$/, "").replace("%+", "+");

// ── Layout helpers ────────────────────────────────────────────────────────────

function YLabel({ text }: { text: string }) {
  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{ width: 14, writingMode: "vertical-rl", transform: "rotate(180deg)" }}
    >
      <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
        {text}
      </span>
    </div>
  );
}

function XAxisLabel({ children }: { children: string }) {
  return (
    <p className="text-center text-[9px] mt-1" style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
      {children}
    </p>
  );
}

// ── Tooltips ──────────────────────────────────────────────────────────────────

const TT: React.CSSProperties = {
  background: "var(--gt-surface)",
  border: "1px solid var(--gt-border-md)",
  borderRadius: "0.375rem",
  padding: "8px 11px",
  fontFamily: TICK_FONT,
  fontSize: 10,
  maxWidth: 210,
  lineHeight: 1.6,
};
const HR: React.CSSProperties = { borderTop: "1px solid var(--gt-border)", margin: "5px 0" };

type TTProps = { active?: boolean; payload?: Array<{ dataKey: string; value: number }>; label?: string };

function OfferTooltip(raw: unknown) {
  const { active, payload, label } = raw as TTProps;
  if (!active || !payload?.length) return null;

  const aiPct    = Math.round((payload.find((p) => p.dataKey === "ai")?.value    ?? 0) * 100);
  const humanPct = Math.round((payload.find((p) => p.dataKey === "human")?.value ?? 0) * 100);
  const pts = stripPct(label ?? "");

  return (
    <div style={TT}>
      <p style={{ color: "var(--gt-t2)", fontWeight: 600, marginBottom: 2 }}>
        Offered {pts} pts of its money
      </p>
      <div style={HR} />
      <p style={{ color: AI_COLOR,    marginBottom: 2 }}>AI:    {aiPct}% of games</p>
      <p style={{ color: HUMAN_COLOR             }}>Human: {humanPct}% of games</p>
      {label === "0–19%" && (
        <>
          <div style={HR} />
          <p style={{ color: "var(--gt-t4)", fontStyle: "italic" }}>Game theory says: always offer the minimum</p>
        </>
      )}
      {label === "50%+" && (
        <>
          <div style={HR} />
          <p style={{ color: "var(--gt-t4)", fontStyle: "italic" }}>Most humans land here — giving away half feels fair</p>
        </>
      )}
    </div>
  );
}

function RejectTooltip(raw: unknown) {
  const { active, payload, label } = raw as TTProps;
  if (!active || !payload?.length) return null;

  const aiPct    = Math.round((payload.find((p) => p.dataKey === "ai")?.value    ?? 0) * 100);
  const humanPct = Math.round((payload.find((p) => p.dataKey === "human")?.value ?? 0) * 100);
  const pts = stripPct(label ?? "");

  return (
    <div style={TT}>
      <p style={{ color: "var(--gt-t2)", fontWeight: 600, marginBottom: 2 }}>
        Received {pts} pts — said no…
      </p>
      <div style={HR} />
      <p style={{ color: AI_COLOR,    marginBottom: 2 }}>AI:    {aiPct}% of the time</p>
      <p style={{ color: HUMAN_COLOR             }}>Human: {humanPct}% of the time</p>
      {(label === "0–19%" || label === "20–29%") && (
        <>
          <div style={HR} />
          <p style={{ color: "var(--gt-t4)", fontStyle: "italic" }}>
            Both walked away empty-handed to punish the unfair offer
          </p>
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function UltimatumGameDistributionView({ aggregateData }: { aggregateData?: StatsData }) {
  return (
    <div className="p-6 flex flex-col gap-8">

      {/* ── Panel 1: Generosity ────────────────────────────────────────────── */}
      <div>
        <p
          className="text-[11px] font-[600] leading-tight mb-0.5"
          style={{ color: "var(--gt-t2)", fontFamily: "var(--gt-font-outfit), system-ui", letterSpacing: "var(--gt-tracking-tight)" }}
        >
          How Much of Its Money Does AI Offer?
        </p>
        <p className="text-[10px] mb-3" style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
          Humans offer half the pot 50% of the time — does AI do the same?
        </p>
        <div className="flex gap-1">
          <YLabel text="% of games" />
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={toOfferData(aggregateData)}
                margin={{ top: 18, right: 16, bottom: 4, left: 8 }}
                barCategoryGap="32%"
                barGap={4}
              >
                <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
                <XAxis dataKey="bin" tick={axisTickProps} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={pct} domain={[0, 0.65]} tickCount={5} tick={axisTickProps} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<OfferTooltip />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
                <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} fillOpacity={0.80} radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="human" position="top" formatter={pctLabelFmt} style={{ fontSize: 9, fontFamily: "IBMPlexMono,monospace", fill: HUMAN_COLOR }} />
                </Bar>
                <Bar dataKey="ai" name="AI" fill={AI_COLOR} fillOpacity={0.85} radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="ai" position="top" formatter={pctLabelFmt} style={{ fontSize: 9, fontFamily: "IBMPlexMono,monospace", fill: AI_COLOR }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <XAxisLabel>% of wealth offered to other player</XAxisLabel>
          </div>
        </div>
      </div>

      {/* ── Panel 2: Rejection ─────────────────────────────────────────────── */}
      <div>
        <p
          className="text-[11px] font-[600] leading-tight mb-0.5"
          style={{ color: "var(--gt-t2)", fontFamily: "var(--gt-font-outfit), system-ui", letterSpacing: "var(--gt-tracking-tight)" }}
        >
          Does AI Have Pride? Rejection Rate by Offer Received
        </p>
        <p className="text-[10px] mb-3" style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
          Saying no means both walk away empty. 53% of humans still do it — pride over profit.
        </p>
        <div className="flex gap-1">
          <YLabel text="% rejected" />
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={toRejectData(aggregateData)}
                margin={{ top: 18, right: 16, bottom: 4, left: 8 }}
                barCategoryGap="32%"
                barGap={4}
              >
                <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
                <XAxis dataKey="bin" tick={axisTickProps} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={pct} domain={[0, 0.7]} tickCount={5} tick={axisTickProps} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<RejectTooltip />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
                <ReferenceLine y={0} stroke="hsl(30 8% 68%)" strokeDasharray="4 3" strokeWidth={1} />
                <Bar dataKey="human" name="Human" fill={HUMAN_COLOR} fillOpacity={0.80} radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="human" position="top" formatter={pctLabelFmt} style={{ fontSize: 9, fontFamily: "IBMPlexMono,monospace", fill: HUMAN_COLOR }} />
                </Bar>
                <Bar dataKey="ai" name="AI" fill={AI_COLOR} fillOpacity={0.85} radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="ai" position="top" formatter={pctLabelFmt} style={{ fontSize: 9, fontFamily: "IBMPlexMono,monospace", fill: AI_COLOR }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <XAxisLabel>% of wealth offered to other player</XAxisLabel>
          </div>
        </div>
      </div>

      <AiHumanLegend />
      <SourceAttribution papers={[
        "Human offers: Andreoni, Castillo & Petrie (2003) · AER 93(3) · n≈200 pairs",
        "Human rejection: Yamagishi et al. (2012) · PNAS 109(52)",
        "AI: atypica.AI personas · accumulated sessions",
      ]} />
    </div>
  );
}
