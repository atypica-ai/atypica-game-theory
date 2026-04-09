"use client";

import { ReactNode } from "react";

// ── Shared styling constants ─────────────────────────────────────────────────

export const MONO = "IBMPlexMono, monospace";
export const SERIF = "'Instrument Serif', Georgia, serif";

export const tableBorder = "1px solid var(--gt-border)";
export const headerCell: React.CSSProperties = {
  background: "var(--gt-row-alt)",
  color: "var(--gt-t3)",
  fontFamily: MONO,
  fontSize: "10px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  borderRight: tableBorder,
  borderBottom: tableBorder,
};
export const numCell: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  fontVariantNumeric: "tabular-nums",
  letterSpacing: "var(--gt-tracking-tight)",
  lineHeight: 1,
};

// ── Shared helper components ─────────────────────────────────────────────────

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <span
        className="text-[11px] uppercase block mb-3"
        style={{ color: "var(--gt-t4)", fontFamily: MONO, letterSpacing: "0.1em" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

export function Overview({ children }: { children: ReactNode }) {
  return (
    <p className="text-[14px] leading-relaxed mb-6" style={{ color: "var(--gt-t2)" }}>
      {children}
    </p>
  );
}

export function Insight({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[14px] leading-relaxed mt-1"
      style={{ color: "var(--gt-t3)", fontFamily: SERIF, fontStyle: "italic" }}
    >
      {children}
    </p>
  );
}

export type Variant = "pos" | "neg" | "warn" | "neutral";
export function variantColor(v: Variant) {
  return v === "pos" ? "var(--gt-pos)" : v === "neg" ? "var(--gt-neg)" : v === "warn" ? "var(--gt-warn)" : "var(--gt-t1)";
}

export function OutcomeTable({ rows }: { rows: { label: string; pts: number | string; note: string; variant: Variant }[] }) {
  return (
    <table className="text-left border-collapse w-full" style={{ border: tableBorder }}>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={row.label} style={{ background: idx % 2 === 0 ? "var(--gt-surface)" : "var(--gt-row-alt)" }}>
            <td className="px-3 py-2 text-[11px]" style={{ color: "var(--gt-t2)", borderRight: tableBorder, borderBottom: tableBorder }}>
              {row.label}
            </td>
            <td className="px-4 py-2" style={{ ...numCell, color: variantColor(row.variant), borderRight: tableBorder, borderBottom: tableBorder }}>
              {row.pts}
            </td>
            <td className="px-3 py-2 text-[10px]" style={{ color: "var(--gt-t4)", fontFamily: MONO, borderBottom: tableBorder }}>
              {row.note}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
