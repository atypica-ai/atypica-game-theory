"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsData } from "../../lib/stats/types";
import { axisTickProps, ChartPanel, GRID_COLOR, makeTooltip, TICK_FONT } from "../../gameTypes/AcademicChart";
import { getModelColor, MODEL_PALETTE } from "../../lib/modelColors";

/** Resolve color for a column: use stable model color if the key looks like a model, else fall back to palette. */
function colColor(col: { key: string; label: string }, index: number): string {
  // Column keys from model-comparison stats are model names (e.g. "gemini-3-flash")
  // Try the key first, then the label — getModelColor returns a deterministic fallback for unknown names
  if (col.key.includes("-") || col.key.includes(".")) return getModelColor(col.key);
  if (col.label.includes("-") || col.label.includes(".")) return getModelColor(col.label);
  return MODEL_PALETTE[index % MODEL_PALETTE.length];
}

function formatValue(v: number, format?: string): string {
  if (format === "percent") return `${Math.round(v * 100)}%`;
  if (format === "integer") return String(Math.round(v));
  return v.toFixed(2);
}

/**
 * Generic bar / grouped-bar chart that renders any StatsData.
 * - Single column → simple bar chart
 * - Multiple columns → grouped bars (one color per column)
 */
export function StatsBarChart({
  data,
  title,
  subtitle,
  height = 280,
}: {
  data: StatsData;
  title?: string;
  subtitle?: string;
  height?: number;
}) {
  if (data.rows.length === 0) return null;

  const format = data.columns[0]?.format ?? "decimal";
  const fmt = (v: number) => formatValue(v, format);
  const TooltipContent = makeTooltip(fmt);

  // Transform StatsData rows into recharts-compatible flat objects
  const chartData = data.rows.map((row) => ({
    label: row.label,
    ...row.values,
  }));

  // Determine Y domain
  const allValues = data.rows.flatMap((r) => Object.values(r.values));
  const maxVal = Math.max(...allValues, 0);
  const yMax = format === "percent" ? Math.min(Math.ceil(maxVal * 10) / 10 + 0.1, 1) : undefined;

  const labelFmt = (v: unknown): string => {
    if (typeof v !== "number") return "";
    return formatValue(v, format);
  };

  return (
    <div className="flex flex-col gap-2">
      {title && <ChartPanel title={title} subtitle={subtitle}>{null}</ChartPanel>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 24, right: 16, bottom: 8, left: 32 }}
          barCategoryGap="20%"
          barGap={2}
        >
          <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
          <XAxis
            dataKey="label"
            tick={{ ...axisTickProps, fontSize: data.rows.length > 6 ? 8 : 10 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={data.rows.length > 8 ? -30 : 0}
            textAnchor={data.rows.length > 8 ? "end" : "middle"}
            height={data.rows.length > 8 ? 60 : 30}
          />
          <YAxis
            tickFormatter={fmt}
            domain={yMax ? [0, yMax] : undefined}
            tickCount={5}
            tick={axisTickProps}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<TooltipContent />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.35 }} />
          {data.columns.map((col, i) => (
            <Bar
              key={col.key}
              dataKey={col.key}
              name={col.label}
              fill={colColor(col, i)}
              fillOpacity={0.85}
              radius={[3, 3, 0, 0]}
            >
              {data.columns.length <= 2 && data.rows.length <= 6 && (
                <LabelList
                  dataKey={col.key}
                  position="top"
                  formatter={labelFmt}
                  style={{ fontSize: 9, fontFamily: TICK_FONT, fill: colColor(col, i) }}
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      {data.columns.length > 1 && (
        <div className="flex items-center gap-4 flex-wrap">
          {data.columns.map((col, i) => (
            <div key={col.key} className="flex items-center gap-1.5">
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: colColor(col, i),
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 10, color: "var(--gt-t3)", fontFamily: TICK_FONT }}>
                {col.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
