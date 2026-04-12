"use client";

import type { StatsData } from "../../lib/stats/types";
import { TICK_FONT } from "../../gameTypes/AcademicChart";

function formatValue(v: number, format?: string): string {
  if (format === "percent") return `${Math.round(v * 100)}%`;
  if (format === "integer") return String(Math.round(v));
  return v.toFixed(2);
}

/**
 * Generic ranked table that renders any StatsData as a leaderboard.
 * Uses meta fields for tags, model info, etc.
 */
export function StatsLeaderboard({
  data,
  title,
  subtitle,
  maxRows = 20,
}: {
  data: StatsData;
  title?: string;
  subtitle?: string;
  maxRows?: number;
}) {
  if (data.rows.length === 0) return null;

  const rows = data.rows.slice(0, maxRows);

  return (
    <div className="flex flex-col gap-3">
      {title && (
        <div>
          <p
            className="text-[13px] font-[600] leading-tight"
            style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
          >
            {title}
          </p>
          {subtitle && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

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
            {rows.map((row, i) => (
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
                  {row.label}
                </td>
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
            ))}
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
