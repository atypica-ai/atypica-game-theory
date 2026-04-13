"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { useMemo, useState } from "react";
import type { StatsData, StatsRow } from "../../lib/stats/types";

const TICK_FONT = "IBMPlexMono, monospace";

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

// ── Toggle pill group ────────────────────────────────────────────────────────

function TogglePills({
  options,
  active,
  onChange,
}: {
  options: { value: string; label: string }[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex p-[3px] rounded-md"
      style={{ background: "var(--gt-row-alt)" }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-3 py-1 text-[10px] font-[500] rounded transition-all"
          style={{
            background: active === opt.value ? "var(--gt-surface)" : "transparent",
            color: active === opt.value ? "var(--gt-t1)" : "var(--gt-t4)",
            boxShadow: active === opt.value ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            fontFamily: TICK_FONT,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Model Performance Leaderboard ────────────────────────────────────────────

function modelProvider(label: string): string {
  if (label.includes("Claude") || label.includes("Haiku") || label.includes("Sonnet") || label.includes("Opus"))
    return "Anthropic";
  if (label.includes("GPT") || label.includes("gpt")) return "OpenAI";
  if (label.includes("Gemini") || label.includes("gemini")) return "Google";
  if (label.includes("Llama") || label.includes("llama")) return "Meta";
  if (label.includes("Mistral") || label.includes("mistral")) return "Mistral AI";
  if (label.includes("Qwen") || label.includes("qwen")) return "Alibaba";
  if (label.includes("DeepSeek") || label.includes("deepseek")) return "DeepSeek";
  if (label.includes("Grok") || label.includes("grok")) return "xAI";
  return "—";
}

export function ModelLeaderboard({
  data,
  maxRows = 20,
}: {
  data: StatsData;
  maxRows?: number;
}) {
  const rows = data.rows.slice(0, maxRows);
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" style={{ color: "var(--gt-blue)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h2
            className="text-[16px] font-[600]"
            style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
          >
            Model Performance Leaderboard
          </h2>
        </div>
        <TogglePills
          options={[
            { value: "winrate", label: "Win Rate" },
            { value: "payoff", label: "Avg. Payoff" },
          ]}
          active="winrate"
          onChange={() => {}}
        />
      </div>

      {/* Table */}
      <div
        className="overflow-hidden"
        style={{
          background: "var(--gt-surface)",
          border: "1px solid var(--gt-border)",
          borderRadius: "0.375rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--gt-row-alt)" }}>
              <th
                className="px-4 py-3 border-b"
                style={{
                  borderColor: "var(--gt-border)",
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.025em",
                  color: "var(--gt-t3)",
                  width: 56,
                }}
              >
                Rank
              </th>
              <th
                className="px-4 py-3 border-b"
                style={{
                  borderColor: "var(--gt-border)",
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.025em",
                  color: "var(--gt-t3)",
                  width: 220,
                }}
              >
                Model
              </th>
              <th
                className="px-4 py-3 border-b"
                style={{
                  borderColor: "var(--gt-border)",
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.025em",
                  color: "var(--gt-t3)",
                }}
              >
                Win Rate Performance
              </th>
              <th
                className="px-4 py-3 border-b text-right"
                style={{
                  borderColor: "var(--gt-border)",
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.025em",
                  color: "var(--gt-t3)",
                  width: 120,
                }}
              >
                Avg. Payoff
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((row, i) => {
              const rate = row.values.winRate ?? 0;
              const avgPayoff = (row.meta?.avgPayoff as number) ?? 0;
              return (
                <tr
                  key={row.label}
                  className="transition-colors"
                  style={{
                    borderBottom: i < rows.length - 1 ? "1px solid var(--gt-border)" : undefined,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gt-row-alt)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td
                    className="px-4 py-3"
                    style={{ fontFamily: TICK_FONT, color: "var(--gt-t4)", fontSize: 12 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span
                        className="font-[500] text-[13px]"
                        style={{ color: "var(--gt-t1)" }}
                      >
                        {row.label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: "var(--gt-t4)",
                        }}
                      >
                        {modelProvider(row.label)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex-1 h-[12px] overflow-hidden"
                        style={{
                          background: "var(--gt-border)",
                          borderRadius: "9999px",
                        }}
                      >
                        <div
                          className="h-full"
                          style={{
                            width: `${Math.round(rate * 100)}%`,
                            background: "var(--gt-blue)",
                            borderRadius: "9999px",
                          }}
                        />
                      </div>
                      <span
                        className="text-right tabular-nums shrink-0"
                        style={{
                          fontFamily: TICK_FONT,
                          fontSize: 12,
                          width: 40,
                          color: "var(--gt-t1)",
                        }}
                      >
                        {Math.round(rate * 100)}%
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 text-right tabular-nums"
                    style={{ fontFamily: TICK_FONT, color: "var(--gt-t2)", fontSize: 13 }}
                  >
                    {avgPayoff.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.rows.length > maxRows && (
        <p className="text-[10px] mt-2" style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
          Showing top {maxRows} of {data.rows.length}
        </p>
      )}
    </div>
  );
}

// ── Participant Leaderboard ──────────────────────────────────────────────────

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

  const hasTags = rows.some(
    (r) => Array.isArray(r.meta?.tags) && (r.meta.tags as string[]).length > 0,
  );

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" style={{ color: "var(--gt-blue)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2
            className="text-[16px] font-[600]"
            style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
          >
            {title ?? "AI Participant Leaderboard"}
          </h2>
        </div>

        {filterable && (
          <TogglePills
            options={FILTER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            active={filter}
            onChange={(v) => setFilter(v as FilterMode)}
          />
        )}
      </div>

      {subtitle && (
        <p
          className="text-[11px] -mt-3 mb-4"
          style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}
        >
          {subtitle}
        </p>
      )}

      {/* Table */}
      <div
        className="overflow-hidden"
        style={{
          background: "var(--gt-surface)",
          border: "1px solid var(--gt-border)",
          borderRadius: "0.375rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--gt-row-alt)" }}>
              <th
                className="px-4 py-3 border-b"
                style={{
                  borderColor: "var(--gt-border)",
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.025em",
                  color: "var(--gt-t3)",
                  width: 56,
                }}
              >
                Rank
              </th>
              <th
                className="px-4 py-3 border-b"
                style={{
                  borderColor: "var(--gt-border)",
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.025em",
                  color: "var(--gt-t3)",
                }}
              >
                Participant
              </th>
              {hasTags && (
                <th
                  className="px-4 py-3 border-b"
                  style={{
                    borderColor: "var(--gt-border)",
                    fontSize: 10,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.025em",
                    color: "var(--gt-t3)",
                  }}
                >
                  Strategic Tags
                </th>
              )}
              <th
                className="px-4 py-3 border-b text-right"
                style={{
                  borderColor: "var(--gt-border)",
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.025em",
                  color: "var(--gt-t3)",
                }}
              >
                Win Rate
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3 + (hasTags ? 1 : 0)}
                  className="px-4 py-8 text-center"
                  style={{ color: "var(--gt-t4)", fontSize: 12, fontFamily: TICK_FONT }}
                >
                  No participants in this category
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const rate = row.values.winRate ?? 0;
                const title = (row.meta?.title as string) || "";
                return (
                  <tr
                    key={row.label + i}
                    className="transition-colors"
                    style={{
                      borderBottom: i < rows.length - 1 ? "1px solid var(--gt-border)" : undefined,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--gt-row-alt)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td
                      className="px-4 py-3"
                      style={{ fontFamily: TICK_FONT, color: "var(--gt-t4)", fontSize: 12 }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.meta?.personaId != null && (
                          <div
                            className="size-10 rounded-full shrink-0 overflow-hidden"
                            style={{ border: "1px solid var(--gt-border)" }}
                          >
                            <HippyGhostAvatar
                              seed={row.meta.personaId as number}
                              className="size-full"
                            />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span
                            className="font-[500] text-[13px]"
                            style={{ color: "var(--gt-t1)" }}
                          >
                            {row.label}
                          </span>
                          {title && (
                            <span
                              style={{
                                fontSize: 10,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                color: "var(--gt-t4)",
                              }}
                            >
                              {title}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {hasTags && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {((row.meta?.tags as string[]) ?? []).map((tag) => (
                            <span
                              key={tag}
                              className="inline-block px-2 py-0.5 rounded-full text-[11px] font-[500]"
                              style={{
                                background: "var(--gt-row-alt)",
                                color: "var(--gt-t3)",
                                border: "1px solid var(--gt-border)",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span
                          className="tabular-nums font-[600]"
                          style={{
                            fontFamily: TICK_FONT,
                            fontSize: 13,
                            color: "var(--gt-blue)",
                          }}
                        >
                          {Math.round(rate * 100)}%
                        </span>
                        <div
                          className="overflow-hidden shrink-0"
                          style={{
                            width: 96,
                            height: 6,
                            background: "var(--gt-border)",
                            borderRadius: "9999px",
                          }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.round(rate * 100)}%`,
                              background: "var(--gt-blue)",
                              borderRadius: "9999px",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data.rows.length > maxRows && (
        <p className="text-[10px] mt-2" style={{ color: "var(--gt-t4)", fontFamily: TICK_FONT }}>
          Showing top {maxRows} of {data.rows.length}
        </p>
      )}
    </div>
  );
}
