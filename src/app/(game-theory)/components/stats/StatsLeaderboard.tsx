"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { useMemo, useState } from "react";
import type { StatsData, StatsRow } from "../../lib/stats/types";
import { TICK_FONT } from "../../gameTypes/AcademicChart";

function formatValue(v: number, format?: string): string {
  if (format === "percent") return `${Math.round(v * 100)}%`;
  if (format === "integer") return String(Math.round(v));
  return v.toFixed(2);
}

// ── Filter types ─────────────────────────────────────────────────────────────

type FilterMode = "all" | "ai" | "human";

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ai", label: "AI Only" },
  { value: "human", label: "Human Only" },
];

function filterRows(rows: StatsRow[], mode: FilterMode): StatsRow[] {
  if (mode === "all") return rows;
  if (mode === "ai") return rows.filter((r) => !r.meta?.isHuman);
  return rows.filter((r) => r.meta?.isHuman);
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Ranked leaderboard table with optional All / AI Only / Human Only toggle.
 * Set `filterable` to enable the toggle (only useful when data has isHuman meta).
 */
export function StatsLeaderboard({
  data,
  title,
  subtitle,
  maxRows = 20,
  filterable = false,
}: {
  data: StatsData;
  title?: string;
  subtitle?: string;
  maxRows?: number;
  filterable?: boolean;
}) {
  const [filter, setFilter] = useState<FilterMode>("all");

  const rows = useMemo(() => {
    const filtered = filterable ? filterRows(data.rows, filter) : data.rows;
    return filtered.slice(0, maxRows);
  }, [data.rows, filter, filterable, maxRows]);

  if (data.rows.length === 0) return null;

  const hasTitle = rows.some((r) => r.meta?.title);

  return (
    <div className="flex flex-col gap-3">
      {/* Header: title + filter toggle */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {title && (
            <p
              className="text-[13px] font-[600] leading-tight"
              style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
            >
              {title}
            </p>
          )}
          {subtitle && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
              {subtitle}
            </p>
          )}
        </div>

        {filterable && (
          <div
            className="flex shrink-0 rounded-md overflow-hidden border"
            style={{ borderColor: "var(--gt-border)" }}
          >
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className="px-3 py-1 text-[11px] font-[500] transition-colors"
                style={{
                  background: filter === opt.value ? "var(--gt-blue)" : "transparent",
                  color: filter === opt.value ? "white" : "var(--gt-t3)",
                  fontFamily: TICK_FONT,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto"
        style={{
          border: "1px solid var(--gt-border)",
          borderRadius: "0.5rem",
          background: "var(--gt-surface)",
        }}
      >
        <table className="w-full" style={{ fontFamily: TICK_FONT, fontSize: 11 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--gt-border)" }}>
              <th
                className="text-left px-3 py-2"
                style={{ color: "var(--gt-t4)", fontWeight: 500, width: 32 }}
              >
                #
              </th>
              <th
                className="text-left px-3 py-2"
                style={{ color: "var(--gt-t4)", fontWeight: 500 }}
              >
                Name
              </th>
              {hasTitle && (
                <th
                  className="text-left px-3 py-2"
                  style={{ color: "var(--gt-t4)", fontWeight: 500 }}
                >
                  Title
                </th>
              )}
              {data.columns.map((col) => (
                <th
                  key={col.key}
                  className="text-right px-3 py-2"
                  style={{ color: "var(--gt-t4)", fontWeight: 500 }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={2 + (hasTitle ? 1 : 0) + data.columns.length}
                  className="px-3 py-8 text-center"
                  style={{ color: "var(--gt-t4)" }}
                >
                  No participants in this category
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.label + i}
                  style={{
                    borderBottom: i < rows.length - 1 ? "1px solid var(--gt-border)" : undefined,
                  }}
                >
                  <td className="px-3 py-2" style={{ color: "var(--gt-t4)" }}>
                    {i + 1}
                  </td>
                  <td className="px-3 py-2 font-[500]" style={{ color: "var(--gt-t1)" }}>
                    <div className="flex items-center gap-2">
                      {row.meta?.personaId != null && (
                        <HippyGhostAvatar seed={row.meta.personaId as number} className="size-5 rounded-full shrink-0" />
                      )}
                      {row.label}
                    </div>
                  </td>
                  {hasTitle && (
                    <td
                      className="px-3 py-2 max-w-[160px] truncate"
                      style={{ color: "var(--gt-t3)" }}
                    >
                      {(row.meta?.title as string) || "—"}
                    </td>
                  )}
                  {data.columns.map((col) => (
                    <td
                      key={col.key}
                      className="text-right px-3 py-2 tabular-nums"
                      style={{ color: "var(--gt-t2)" }}
                    >
                      {formatValue(row.values[col.key] ?? 0, col.format)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.rows.length > maxRows && (
        <p className="text-[10px]" style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
          Showing top {maxRows} of {data.rows.length}
        </p>
      )}
    </div>
  );
}
