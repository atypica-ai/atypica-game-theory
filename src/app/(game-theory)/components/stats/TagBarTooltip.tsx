"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import type { StatsData } from "../../lib/stats/types";
import { TICK_FONT } from "../../gameTypes/AcademicChart";

interface TopPersona {
  personaId: number;
  name: string;
  winRate: number;
}

export function TagBarTooltip({
  data,
  active,
  payload,
  label,
}: {
  data: StatsData;
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  const row = data.rows.find((r) => r.label === label);
  const winRate = payload[0].value;
  const topPersonas = (row?.meta?.topPersonas ?? []) as TopPersona[];

  return (
    <div
      style={{
        background: "var(--gt-surface)",
        border: "1px solid var(--gt-border-md)",
        borderRadius: "0.375rem",
        padding: "8px 10px",
        fontFamily: TICK_FONT,
        fontSize: 10,
        minWidth: 160,
      }}
    >
      <p style={{ color: "var(--gt-t1)", fontWeight: 600, fontSize: 11, marginBottom: 2 }}>
        {label}
      </p>
      <p style={{ color: "var(--gt-t3)", marginBottom: 0 }}>
        Win Rate: {Math.round(winRate * 100)}%
      </p>

      {topPersonas.length > 0 && (
        <>
          <div
            style={{
              height: 1,
              background: "var(--gt-border)",
              margin: "6px 0",
            }}
          />
          <p style={{ color: "var(--gt-t4)", fontSize: 9, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Top performers
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {topPersonas.map((p) => (
              <div key={p.personaId} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                  <HippyGhostAvatar seed={p.personaId} className="size-full" />
                </div>
                <span style={{ color: "var(--gt-t2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </span>
                <span style={{ color: "var(--gt-t3)", flexShrink: 0 }}>
                  {Math.round(p.winRate * 100)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
