"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export interface PMFBin {
  label: string;
  human: number; // probability 0–1 (human reference)
  ai: number;    // probability 0–1 (AI persona data)
}

export interface PMFChartProps {
  title: string;
  subtitle?: string;
  bins: PMFBin[];
  aiColor?: string; // optional override; defaults to --gt-blue resolved value
}

// Grid / axis token values (CSS vars can't be read inside SVG — use resolved values)
const GRID_COLOR   = "hsl(30 5% 88%)";   // --gt-border
const AXIS_LABEL   = "hsl(35 6% 50%)";   // --gt-t3
const AXIS_MINOR   = "hsl(37 5% 64%)";   // --gt-t4
const AI_BAR_COLOR = "hsl(208 77% 52%)"; // --gt-blue (resolved)
const HUMAN_COLOR  = "hsl(30 8% 75%)";   // warm gray stick for human reference

interface PMFBarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  human?: number;
  ai?: number;
  resolvedBarColor?: string;
}

function PMFBarShape({ x, y, width, height, human, ai, resolvedBarColor }: PMFBarShapeProps) {
  const fillColor = resolvedBarColor ?? AI_BAR_COLOR;
  if (
    x === undefined || y === undefined ||
    width === undefined || height === undefined ||
    !ai || ai <= 0
  )
    return null;

  const cx = x + width / 2;
  const barW = Math.min(width * 0.5, 18);
  const barBottom = y + height;

  const humanH = human && human > 0 ? (human / ai) * height : 0;
  const humanY = barBottom - humanH;

  return (
    <g>
      <rect x={cx - barW / 2} y={y} width={barW} height={height} fill={fillColor} fillOpacity={0.75} />
      {humanH > 0 && (
        <rect x={cx - 1.5} y={humanY} width={3} height={humanH} fill={HUMAN_COLOR} fillOpacity={0.9} />
      )}
    </g>
  );
}

export function PMFChart({ title, subtitle, bins, aiColor }: PMFChartProps) {
  const barColor = aiColor ?? AI_BAR_COLOR;
  return (
    <div className="flex flex-col gap-2">
      <div>
        <span
          className="block text-[11px] font-[500]"
          style={{ color: "var(--gt-t2)", letterSpacing: "var(--gt-tracking-tight)" }}
        >
          {title}
        </span>
        {subtitle && (
          <span className="block text-[10px] mt-0.5" style={{ color: "var(--gt-t4)" }}>
            {subtitle}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={bins} margin={{ top: 4, right: 2, bottom: 16, left: 22 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeWidth={0.75} />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: "IBMPlexMono, monospace", fontSize: 8, fill: AXIS_LABEL }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            domain={[0, 1]}
            tickCount={3}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            tick={{ fontFamily: "IBMPlexMono, monospace", fontSize: 7, fill: AXIS_MINOR }}
            axisLine={false}
            tickLine={false}
            width={26}
          />
          <Bar
            dataKey="ai"
            shape={(props: unknown) => (
              <PMFBarShape {...(props as PMFBarShapeProps)} resolvedBarColor={barColor} />
            )}
            isAnimationActive
            animationDuration={500}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
