"use client";

import type { StatsData } from "../../lib/stats/types";

const TICK_FONT = "IBMPlexMono, monospace";

function formatPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/**
 * Compact table showing discussion effect across all game types.
 * Each row: game name, "With Discussion" bar, "Without Discussion" bar, delta.
 */
export function CompactDiscussionGrid({
  discussionEffects,
  discussionGames,
  getDisplayName,
}: {
  discussionEffects: Record<string, StatsData>;
  discussionGames: string[];
  getDisplayName: (gt: string) => string;
}) {
  // Build rows from available data
  const rows: {
    gameType: string;
    name: string;
    withVal: number;
    withoutVal: number;
    metricLabel: string;
  }[] = [];

  for (const gt of discussionGames) {
    const key = `discussion-effect:${gt}`;
    const data = discussionEffects[key];
    if (!data || data.rows.length === 0) continue;

    const row = data.rows[0];
    rows.push({
      gameType: gt,
      name: getDisplayName(gt),
      withVal: row.values.with ?? 0,
      withoutVal: row.values.without ?? 0,
      metricLabel: row.label,
    });
  }

  if (rows.length === 0) return null;

  // Global max for bar scaling
  const maxVal = Math.max(...rows.flatMap((r) => [r.withVal, r.withoutVal]), 0.01);

  return (
    <div
      className="overflow-hidden"
      style={{
        background: "var(--gt-surface)",
        border: "1px solid var(--gt-border)",
        borderRadius: "0.375rem",
      }}
    >
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--gt-row-alt)" }}>
            <th
              className="text-left px-4 py-2.5"
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                color: "var(--gt-t3)",
                borderBottom: "1px solid var(--gt-border)",
                width: 180,
              }}
            >
              Game
            </th>
            <th
              className="text-left px-4 py-2.5"
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                color: "var(--gt-t3)",
                borderBottom: "1px solid var(--gt-border)",
              }}
            >
              With Discussion
            </th>
            <th
              className="text-left px-4 py-2.5"
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                color: "var(--gt-t3)",
                borderBottom: "1px solid var(--gt-border)",
              }}
            >
              Without Discussion
            </th>
            <th
              className="text-right px-4 py-2.5"
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.025em",
                color: "var(--gt-t3)",
                borderBottom: "1px solid var(--gt-border)",
                width: 72,
              }}
            >
              Delta
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const delta = row.withVal - row.withoutVal;
            const deltaPositive = delta >= 0;

            return (
              <tr
                key={row.gameType}
                className="transition-colors"
                style={{
                  borderBottom: i < rows.length - 1 ? "1px solid var(--gt-border)" : undefined,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gt-row-alt)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Game name + metric */}
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span
                      className="text-[12px] font-[600]"
                      style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
                    >
                      {row.name}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
                      {row.metricLabel}
                    </span>
                  </div>
                </td>

                {/* With discussion bar */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex-1 h-[12px] overflow-hidden"
                      style={{ background: "var(--gt-border)", borderRadius: "3px" }}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${(row.withVal / maxVal) * 100}%`,
                          background: "var(--gt-blue)",
                          borderRadius: "3px",
                          opacity: 0.8,
                        }}
                      />
                    </div>
                    <span
                      className="shrink-0 tabular-nums text-right"
                      style={{
                        width: 36,
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: TICK_FONT,
                        color: "var(--gt-t1)",
                      }}
                    >
                      {formatPct(row.withVal)}
                    </span>
                  </div>
                </td>

                {/* Without discussion bar */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex-1 h-[12px] overflow-hidden"
                      style={{ background: "var(--gt-border)", borderRadius: "3px" }}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${(row.withoutVal / maxVal) * 100}%`,
                          background: "var(--gt-border-md)",
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                    <span
                      className="shrink-0 tabular-nums text-right"
                      style={{
                        width: 36,
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: TICK_FONT,
                        color: "var(--gt-t2)",
                      }}
                    >
                      {formatPct(row.withoutVal)}
                    </span>
                  </div>
                </td>

                {/* Delta */}
                <td className="px-4 py-3 text-right">
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: TICK_FONT,
                      color: deltaPositive ? "var(--gt-pos)" : "var(--gt-neg)",
                    }}
                  >
                    {deltaPositive ? "+" : ""}
                    {Math.round(delta * 100)}pp
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
