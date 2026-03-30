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
  human: number; // probability 0–1 (human reference, mocked)
  ai: number; // probability 0–1 (AI persona data, mocked or live)
}

export interface PMFChartProps {
  title: string;
  subtitle?: string;
  bins: PMFBin[];
  aiColor: string; // game type accent color
}

// ── Custom bar shape ───────────────────────────────────────────────────────────
// Renders AI colored bar + centered human white stick in the same allocated slot.
// Recharts passes x/y/width/height (computed from dataKey="ai") plus all original
// data fields (including `human`) through to the shape function.

interface PMFBarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  human?: number; // passed from data entry by Recharts
  ai?: number; // bar value
  aiColor: string;
}

function PMFBarShape({ x, y, width, height, human, ai, aiColor }: PMFBarShapeProps) {
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    !ai ||
    ai <= 0
  )
    return null;

  const cx = x + width / 2;
  const barW = Math.min(width * 0.55, 22);
  const barBottom = y + height;

  // humanH = human * chartH = human * (height / ai)
  const humanH = human && human > 0 ? (human / ai) * height : 0;
  const humanY = barBottom - humanH;

  return (
    <g>
      {/* AI colored bar */}
      <rect
        x={cx - barW / 2}
        y={y}
        width={barW}
        height={height}
        fill={aiColor}
        fillOpacity={0.7}
      />
      {/* Human reference stick — thin, white, always on top */}
      {humanH > 0 && (
        <rect x={cx - 1.5} y={humanY} width={3} height={humanH} fill="white" fillOpacity={0.95} />
      )}
    </g>
  );
}

// ── PMFChart ───────────────────────────────────────────────────────────────────

export function PMFChart({ title, subtitle, bins, aiColor }: PMFChartProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Title */}
      <div>
        <span className="font-IBMPlexMono text-[9px] tracking-[0.12em] uppercase text-zinc-300 block font-medium">
          {title}
        </span>
        {subtitle && (
          <span className="font-IBMPlexMono text-[7px] tracking-[0.1em] uppercase text-zinc-600 block mt-0.5">
            {subtitle}
          </span>
        )}
      </div>

      {/* Recharts BarChart */}
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={bins} margin={{ top: 8, right: 4, bottom: 22, left: 26 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="#27272a" strokeWidth={0.5} />
          <XAxis
            dataKey="label"
            tick={{ fontFamily: "IBMPlexMono", fontSize: 8, fill: "#a1a1aa" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            domain={[0, 1]}
            tickCount={3}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            tick={{ fontFamily: "IBMPlexMono", fontSize: 7, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Bar
            dataKey="ai"
            shape={(props: unknown) => {
              const p = props as PMFBarShapeProps;
              return <PMFBarShape {...p} aiColor={aiColor} />;
            }}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
