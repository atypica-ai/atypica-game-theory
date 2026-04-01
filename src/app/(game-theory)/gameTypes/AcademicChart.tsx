"use client";

import { Fragment } from "react";

// ── Design tokens (resolved from CSS vars — usable inside SVG) ───────────────
export const HUMAN_COLOR = "hsl(30 8% 60%)";
export const AI_COLOR    = "hsl(208 77% 52%)";
export const GRID_COLOR  = "hsl(30 5% 88%)";
export const AXIS_COLOR  = "hsl(35 6% 50%)";
export const TICK_FONT   = "IBMPlexMono, monospace";
export const LABEL_FONT  = "var(--gt-font-outfit), system-ui, sans-serif";

export const axisTickProps = {
  fontFamily: TICK_FONT,
  fontSize: 9,
  fill: AXIS_COLOR,
};

// ── ChartPanel ────────────────────────────────────────────────────────────────
export function ChartPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <p
          className="text-[11px] font-[600] leading-tight"
          style={{
            color: "var(--gt-t2)",
            fontFamily: LABEL_FONT,
            letterSpacing: "var(--gt-tracking-tight)",
          }}
        >
          {title}
        </p>
        {subtitle && (
          <p className="text-[10px] mt-0.5" style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        style={{ display: "inline-block", width: 14, height: 3, borderRadius: 2, backgroundColor: color, flexShrink: 0 }}
      />
      <span style={{ fontSize: 10, color: "var(--gt-t3)", fontFamily: TICK_FONT }}>{label}</span>
    </div>
  );
}

export function AiHumanLegend() {
  return (
    <div className="flex items-center gap-5">
      <LegendDot color={AI_COLOR} label="AI personas" />
      <LegendDot color={HUMAN_COLOR} label="Human baseline" />
    </div>
  );
}

// ── Source attribution ────────────────────────────────────────────────────────
export function SourceAttribution({ papers }: { papers: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
      <span
        style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", flexShrink: 0, background: "var(--gt-border-md)" }}
      />
      {papers.map((paper, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span
              style={{ display: "inline-block", width: 1, height: 12, flexShrink: 0, background: "var(--gt-border-md)" }}
            />
          )}
          <span style={{ fontSize: 10, color: "var(--gt-t4)", fontFamily: TICK_FONT, letterSpacing: "0.03em" }}>
            {paper}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

// ── Typed label formatters for recharts LabelList ────────────────────────────
// LabelFormatter = (label: RenderableText) => RenderableText
// where RenderableText = string | number | boolean | null | undefined
type RenderableText = string | number | boolean | null | undefined;

export const pctLabelFmt = (v: RenderableText): RenderableText =>
  v == null || typeof v === "boolean" ? "" : `${Math.round(Number(v) * 100)}%`;

export const numLabelFmt = (v: RenderableText): RenderableText =>
  v == null || typeof v === "boolean" ? "" : String(Math.round(Number(v)));

// ── Shared tooltip renderer ───────────────────────────────────────────────────
export function makeTooltip(pctFormatter: (v: number) => string = (v) => `${Math.round(v * 100)}%`) {
  return function TooltipContent(props: unknown) {
    const { active, payload, label } = props as {
      active?: boolean;
      payload?: Array<{ name: string; value: number; color?: string }>;
      label?: string;
    };
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: "var(--gt-surface)",
          border: "1px solid var(--gt-border-md)",
          borderRadius: "0.375rem",
          padding: "5px 9px",
          fontFamily: TICK_FONT,
          fontSize: 10,
        }}
      >
        {label != null && (
          <p style={{ color: "var(--gt-t3)", marginBottom: 3 }}>{label}</p>
        )}
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color ?? "var(--gt-t2)", marginBottom: 1 }}>
            {entry.name}: {pctFormatter(entry.value)}
          </p>
        ))}
      </div>
    );
  };
}
