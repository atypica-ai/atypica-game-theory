"use client";

import type { StatsData } from "../../lib/stats/types";

const TICK_FONT = "IBMPlexMono, monospace";

function formatPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/** One game's discussion-effect data: game name + metric rows */
interface GameGroup {
  gameType: string;
  name: string;
  metrics: {
    label: string;
    withVal: number;
    withoutVal: number;
  }[];
}

/**
 * Compact table showing discussion effect across all game types.
 * Supports multiple decision rows per game (e.g., "Choose Stag" + "Choose Hare").
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
  const groups: GameGroup[] = [];

  for (const gt of discussionGames) {
    const key = `discussion-effect:${gt}`;
    const data = discussionEffects[key];
    if (!data || data.rows.length === 0) continue;

    groups.push({
      gameType: gt,
      name: getDisplayName(gt),
      metrics: data.rows.map((row) => ({
        label: row.label,
        withVal: row.values.with ?? 0,
        withoutVal: row.values.without ?? 0,
      })),
    });
  }

  if (groups.length === 0) return null;

  // Global max for consistent bar scaling
  const maxVal = Math.max(
    ...groups.flatMap((g) => g.metrics.flatMap((m) => [m.withVal, m.withoutVal])),
    0.01,
  );

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
            {(
              [
                { label: "Game / Decision", width: 200, align: "left" as const },
                { label: "With Discussion", align: "left" as const },
                { label: "Without Discussion", align: "left" as const },
                { label: "Delta", width: 72, align: "right" as const },
              ] as const
            ).map((col) => (
              <th
                key={col.label}
                className={`px-4 py-2.5 text-${col.align}`}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.025em",
                  color: "var(--gt-t3)",
                  borderBottom: "1px solid var(--gt-border)",
                  ...("width" in col ? { width: col.width } : {}),
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group, gi) => (
            group.metrics.map((metric, mi) => {
              const delta = metric.withVal - metric.withoutVal;
              const deltaPositive = delta >= 0;
              const isFirstInGroup = mi === 0;
              const isLastInGroup = mi === group.metrics.length - 1;
              const isLastGroup = gi === groups.length - 1;

              return (
                <tr
                  key={`${group.gameType}-${mi}`}
                  className="transition-colors"
                  style={{
                    borderBottom:
                      isLastInGroup && !isLastGroup
                        ? "1px solid var(--gt-border)"
                        : undefined,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gt-row-alt)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Game name (first row) or decision label (sub-rows) */}
                  <td
                    className="px-4"
                    style={{
                      paddingTop: isFirstInGroup ? 12 : 4,
                      paddingBottom: isLastInGroup ? 12 : 4,
                    }}
                  >
                    {isFirstInGroup ? (
                      <div className="flex flex-col">
                        <span
                          className="text-[12px] font-[600]"
                          style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
                        >
                          {group.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--gt-t3)",
                            fontFamily: TICK_FONT,
                            fontWeight: 500,
                          }}
                        >
                          {metric.label}
                        </span>
                      </div>
                    ) : (
                      <span
                        className="pl-2"
                        style={{
                          fontSize: 10,
                          color: "var(--gt-t3)",
                          fontFamily: TICK_FONT,
                          fontWeight: 500,
                        }}
                      >
                        {metric.label}
                      </span>
                    )}
                  </td>

                  {/* With discussion bar */}
                  <td
                    className="px-4"
                    style={{
                      paddingTop: isFirstInGroup ? 12 : 4,
                      paddingBottom: isLastInGroup ? 12 : 4,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex-1 h-[10px] overflow-hidden"
                        style={{ background: "var(--gt-border)", borderRadius: "3px" }}
                      >
                        <div
                          className="h-full"
                          style={{
                            width: `${(metric.withVal / maxVal) * 100}%`,
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
                        {formatPct(metric.withVal)}
                      </span>
                    </div>
                  </td>

                  {/* Without discussion bar */}
                  <td
                    className="px-4"
                    style={{
                      paddingTop: isFirstInGroup ? 12 : 4,
                      paddingBottom: isLastInGroup ? 12 : 4,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex-1 h-[10px] overflow-hidden"
                        style={{ background: "var(--gt-border)", borderRadius: "3px" }}
                      >
                        <div
                          className="h-full"
                          style={{
                            width: `${(metric.withoutVal / maxVal) * 100}%`,
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
                        {formatPct(metric.withoutVal)}
                      </span>
                    </div>
                  </td>

                  {/* Delta */}
                  <td
                    className="px-4 text-right"
                    style={{
                      paddingTop: isFirstInGroup ? 12 : 4,
                      paddingBottom: isLastInGroup ? 12 : 4,
                    }}
                  >
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
            })
          ))}
        </tbody>
      </table>
    </div>
  );
}
