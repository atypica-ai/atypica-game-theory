"use client";

import { motion } from "motion/react";

interface RoundPillProps {
  roundId: number;
  payoffSum: number | null; // null = round in progress (no result yet)
  isViewing: boolean;       // currently displayed in the arena
  isLive: boolean;          // this is the active in-progress round
  onClick: () => void;
}

/**
 * Compact round pill for the history bar.
 * Active/live round gets ghost-green styling and a pulsing dot.
 */
export function RoundPill({ roundId, payoffSum, isViewing, isLive, onClick }: RoundPillProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 h-full border-r border-white/[0.04] shrink-0 transition-colors duration-200"
      style={{
        color: isViewing ? (isLive ? "#1bff1b" : "rgba(255,255,255,0.7)") : "#52525b",
        background: isViewing
          ? isLive
            ? "rgba(27,255,27,0.04)"
            : "rgba(255,255,255,0.03)"
          : "transparent",
      }}
    >
      {isLive && (
        <motion.span
          className="w-1 h-1 rounded-full shrink-0"
          style={{ backgroundColor: "#1bff1b" }}
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}
      <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase tabular-nums whitespace-nowrap">
        R{roundId}
        {payoffSum !== null ? (
          <span className="opacity-50 ml-1">· {payoffSum}</span>
        ) : (
          <span
            className="ml-1"
            style={{ color: isLive ? "#1bff1b" : "inherit", opacity: isLive ? 0.7 : 0.4 }}
          >
            · live
          </span>
        )}
      </span>
    </button>
  );
}
