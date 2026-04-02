"use client";

import { SessionListItem } from "@/app/(game-theory)/actions";
import { computeAggregateLabel, formatDateFull } from "./utils";

export function AggregateBar({
  sessions,
  gameType,
}: {
  sessions: SessionListItem[];
  gameType: string;
}) {
  const completedCount = sessions.filter((s) => s.status === "completed").length;
  const runningCount = sessions.filter((s) => s.status === "running").length;
  const aggregateLabel = computeAggregateLabel(gameType, sessions);
  const lastRun = sessions.length > 0 ? sessions[0].createdAt : null;

  return (
    <div
      className="px-8 py-3 border-b flex items-center gap-8"
      style={{
        borderColor: "var(--gt-border)",
        background: "var(--gt-surface)",
      }}
    >
      <Stat label="sessions" value={sessions.length.toString()} />
      <Divider />
      <Stat label="completed" value={completedCount.toString()} />
      {runningCount > 0 && (
        <>
          <Divider />
          <Stat label="running" value={runningCount.toString()} color="var(--gt-blue)" />
        </>
      )}
      {aggregateLabel && (
        <>
          <Divider />
          <Stat label="aggregate" value={aggregateLabel} />
        </>
      )}
      {lastRun && (
        <>
          <div className="flex-1" />
          <span
            className="text-[11px]"
            style={{
              color: "var(--gt-t4)",
              fontFamily: "IBMPlexMono, monospace",
            }}
          >
            last run: {formatDateFull(lastRun)}
          </span>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-[15px] font-[600]"
        style={{
          color: color ?? "var(--gt-t1)",
          fontFamily: "IBMPlexMono, monospace",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </span>
      <span
        className="text-[11px] uppercase"
        style={{
          color: "var(--gt-t4)",
          fontFamily: "IBMPlexMono, monospace",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <span className="w-px h-3" style={{ background: "var(--gt-border-md)" }} />;
}
