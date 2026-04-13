"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StatsData } from "../../lib/stats/types";
import { getModelColor } from "../../lib/modelColors";
import { axisTickProps, GRID_COLOR, makeTooltip, TICK_FONT } from "../../gameTypes/AcademicChart";

// ── Game metadata ──────────────────────────────────────────────────────────

interface GameMeta {
  subtitle: string;
  yLabel: string;
  multiRound?: boolean;
}

const GAME_META: Record<string, GameMeta> = {
  "prisoner-dilemma": {
    subtitle: "How often models cooperate across rounds",
    yLabel: "Cooperation Rate",
    multiRound: true,
  },
  "stag-hunt": {
    subtitle: "Coordination on risky stag vs safe hare",
    yLabel: "Stag Choice Rate",
    multiRound: true,
  },
  "golden-ball": {
    subtitle: "Split vs steal from the shared pool",
    yLabel: "Split Rate",
    multiRound: true,
  },
  "beauty-contest": {
    subtitle: "Average guess — optimal is 2/3 of group median",
    yLabel: "Guess",
  },
  "public-goods": {
    subtitle: "Average contribution to the shared pool",
    yLabel: "Contribution",
  },
  "ultimatum-game": {
    subtitle: "Average share offered to receiver",
    yLabel: "Offer (%)",
  },
  "volunteer-dilemma": {
    subtitle: "How often a model volunteers",
    yLabel: "Volunteer Rate",
  },
  "all-pay-auction": {
    subtitle: "Average bid — all pay, highest wins",
    yLabel: "Bid",
  },
  "trolley-problem": {
    subtitle: "How often a model pulls the lever",
    yLabel: "Pull Lever Rate",
  },
  "colonel-blotto": {
    subtitle: "Average troops concentrated on battlefield 1",
    yLabel: "Troops on BF1",
  },
};

// ── Model display name helper ──────────────────────────────────────────────

function shortModelLabel(model: string): string {
  const aliases: Record<string, string> = {
    "claude-haiku-4-5": "Claude Haiku",
    "claude-sonnet-4": "Claude Sonnet",
    "gemini-3-flash": "Gemini Flash",
    "gemini-2.5-flash": "Gemini 2.5 Flash",
    "gpt-4.1-mini": "GPT Mini",
    "gpt-5-mini": "GPT 5 Mini",
    "gpt-4o": "GPT 4o",
  };
  return aliases[model] ?? model;
}

// ── Format helper ──────────────────────────────────────────────────────────

function formatVal(v: number, format?: string): string {
  if (format === "percent") return `${Math.round(v * 100)}%`;
  if (format === "integer") return String(Math.round(v));
  return v.toFixed(1);
}

// ── Model color legend ─────────────────────────────────────────────────────

function ModelLegend({ models }: { models: string[] }) {
  return (
    <div className="flex items-center gap-5 flex-wrap">
      {models.map((m) => (
        <div key={m} className="flex items-center gap-1.5">
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "2px",
              backgroundColor: getModelColor(m),
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--gt-t2)",
              fontFamily: TICK_FONT,
            }}
          >
            {shortModelLabel(m)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Multi-round mini chart ─────────────────────────────────────────────────

function MultiRoundChart({
  data,
  gameType,
  displayName,
}: {
  data: StatsData;
  gameType: string;
  displayName: string;
}) {
  const meta = GAME_META[gameType];
  const fmt = (v: number) => `${Math.round(v * 100)}%`;
  const TooltipContent = makeTooltip(fmt);

  const chartData = data.rows.map((row) => ({
    label: row.label,
    ...row.values,
  }));

  return (
    <div className="flex flex-col gap-1">
      <p
        className="text-[12px] font-[600]"
        style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
      >
        {displayName}
      </p>
      {meta && (
        <p style={{ fontSize: 10, color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
          {meta.subtitle}
        </p>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 8, bottom: 28, left: 4 }}
          barCategoryGap="25%"
          barGap={1}
        >
          <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
          <XAxis
            dataKey="label"
            tick={axisTickProps}
            axisLine={false}
            tickLine={false}
            interval={0}
          >
            <Label
              value="Round"
              position="bottom"
              offset={12}
              style={{ fontSize: 9, fill: "var(--gt-t4)", fontFamily: TICK_FONT }}
            />
          </XAxis>
          <YAxis
            tickFormatter={fmt}
            domain={[0, 1]}
            tickCount={3}
            tick={axisTickProps}
            axisLine={false}
            tickLine={false}
            width={32}
          >
            <Label
              value={meta?.yLabel ?? "Rate"}
              angle={-90}
              position="insideLeft"
              offset={10}
              style={{ fontSize: 9, fill: "var(--gt-t4)", fontFamily: TICK_FONT, textAnchor: "middle" }}
            />
          </YAxis>
          <Tooltip content={<TooltipContent />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
          {data.columns.map((col) => (
            <Bar
              key={col.key}
              dataKey={col.key}
              name={shortModelLabel(col.label)}
              fill={getModelColor(col.key)}
              fillOpacity={0.85}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Single-round compact row ───────────────────────────────────────────────

function SingleRoundRow({
  data,
  gameType,
  displayName,
  maxVal,
}: {
  data: StatsData;
  gameType: string;
  displayName: string;
  maxVal: number;
}) {
  const meta = GAME_META[gameType];
  const col = data.columns[0];
  const format = col?.format;

  return (
    <div
      className="flex flex-col gap-2 py-4"
      style={{ borderBottom: "1px solid var(--gt-border)" }}
    >
      {/* Title + subtitle */}
      <div>
        <p
          className="text-[12px] font-[600]"
          style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
        >
          {displayName}
        </p>
        {meta && (
          <p style={{ fontSize: 10, color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
            {meta.subtitle}
          </p>
        )}
      </div>

      {/* Model bars */}
      <div className="flex flex-col gap-1.5">
        {data.rows.map((row) => {
          const val = row.values[col?.key ?? "mean"] ?? 0;
          const model = (row.meta?.model as string) ?? row.label;
          const barPct = maxVal > 0 ? (val / maxVal) * 100 : 0;

          return (
            <div key={row.label} className="flex items-center gap-3">
              <span
                className="shrink-0 truncate"
                style={{
                  width: 100,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--gt-t2)",
                }}
              >
                {row.label}
              </span>
              <div
                className="flex-1 h-[14px] overflow-hidden relative"
                style={{ background: "var(--gt-border)", borderRadius: "3px" }}
              >
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.min(barPct, 100)}%`,
                    background: getModelColor(model),
                    borderRadius: "3px",
                    opacity: 0.8,
                  }}
                />
              </div>
              <span
                className="shrink-0 tabular-nums text-right"
                style={{
                  width: 48,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: TICK_FONT,
                  color: "var(--gt-t1)",
                }}
              >
                {formatVal(val, format)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function CompactModelGrid({
  modelComparisons,
  gameTypes,
  getDisplayName,
}: {
  modelComparisons: Record<string, StatsData>;
  gameTypes: string[];
  getDisplayName: (gt: string) => string;
}) {
  // Split into multi-round and single-round
  const multiRound: { gt: string; data: StatsData }[] = [];
  const singleRound: { gt: string; data: StatsData }[] = [];

  for (const gt of gameTypes) {
    const key = `model-comparison:${gt}`;
    const data = modelComparisons[key];
    if (!data || data.rows.length === 0) continue;

    if (GAME_META[gt]?.multiRound) {
      multiRound.push({ gt, data });
    } else {
      singleRound.push({ gt, data });
    }
  }

  if (multiRound.length === 0 && singleRound.length === 0) return null;

  // Collect all unique model keys for legend (from multi-round columns)
  const modelKeys = new Set<string>();
  for (const { data } of multiRound) {
    for (const col of data.columns) modelKeys.add(col.key);
  }
  // Also from single-round row meta
  for (const { data } of singleRound) {
    for (const row of data.rows) {
      if (row.meta?.model) modelKeys.add(row.meta.model as string);
    }
  }

  // Compute global max value for single-round bars (per format group)
  const singleRoundMax = Math.max(
    ...singleRound.flatMap(({ data }) =>
      data.rows.map((r) => {
        const col = data.columns[0];
        return r.values[col?.key ?? "mean"] ?? 0;
      }),
    ),
    0.01,
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Shared legend */}
      {modelKeys.size > 0 && (
        <ModelLegend models={[...modelKeys].sort()} />
      )}

      {/* Multi-round section */}
      {multiRound.length > 0 && (
        <div>
          <p
            className="text-[11px] font-[600] uppercase mb-3"
            style={{
              color: "var(--gt-t3)",
              letterSpacing: "0.06em",
              fontFamily: TICK_FONT,
            }}
          >
            Multi-Round Games
          </p>
          <div
            className="grid gap-5"
            style={{
              gridTemplateColumns: `repeat(${Math.min(multiRound.length, 3)}, 1fr)`,
            }}
          >
            {multiRound.map(({ gt, data }) => (
              <div
                key={gt}
                className="p-4"
                style={{
                  background: "var(--gt-surface)",
                  border: "1px solid var(--gt-border)",
                  borderRadius: "0.375rem",
                }}
              >
                <MultiRoundChart
                  data={data}
                  gameType={gt}
                  displayName={getDisplayName(gt)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single-round section */}
      {singleRound.length > 0 && (
        <div>
          <p
            className="text-[11px] font-[600] uppercase mb-3"
            style={{
              color: "var(--gt-t3)",
              letterSpacing: "0.06em",
              fontFamily: TICK_FONT,
            }}
          >
            Single-Round Games
          </p>
          <div
            className="px-5 pt-1 pb-2"
            style={{
              background: "var(--gt-surface)",
              border: "1px solid var(--gt-border)",
              borderRadius: "0.375rem",
            }}
          >
            {singleRound.map(({ gt, data }, i) => (
              <div
                key={gt}
                style={i === singleRound.length - 1 ? { borderBottom: "none" } : undefined}
              >
                <SingleRoundRow
                  data={data}
                  gameType={gt}
                  displayName={getDisplayName(gt)}
                  maxVal={singleRoundMax}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
