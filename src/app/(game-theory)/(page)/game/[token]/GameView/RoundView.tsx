"use client";

import { cn } from "@/lib/utils";

interface RoundTabProps {
  roundId: number;
  payoffSum: number | null; // null = in-progress
  isViewing: boolean;
  isLive: boolean;
  onClick: () => void;
}

/**
 * Category-tab style round selector — bottom-border indicator in --gt-blue.
 * No background fill; matches arena.ai tab pattern exactly.
 */
export function RoundPill({ roundId, payoffSum, isViewing, isLive, onClick }: RoundTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-5 h-full text-[13px] font-[500] transition-colors duration-150 border-b-2 shrink-0 whitespace-nowrap",
        isViewing
          ? "border-[var(--gt-blue)] text-[var(--gt-blue)]"
          : "border-transparent text-[var(--gt-t3)] hover:text-[var(--gt-t2)]",
      )}
    >
      {isLive && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
          style={{ backgroundColor: "var(--gt-blue)" }}
        />
      )}
      <span className="tracking-[0.04em]" style={{ fontFamily: '"IBM Plex Mono", monospace' }}>
        R{roundId}
      </span>
      {payoffSum !== null ? (
        <span className="text-[var(--gt-t4)] text-[11px] tabular-nums">· {payoffSum}</span>
      ) : isLive ? (
        <span className="text-[11px]" style={{ color: "var(--gt-blue)" }}>· live</span>
      ) : null}
    </button>
  );
}
