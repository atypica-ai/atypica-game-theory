"use client";

import { PersonaDecisionEvent, PersonaDiscussionEvent } from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

// 10 unique accent colors — one per player slot
export const PLAYER_COLORS = [
  "#1bff1b", // ghost-green
  "#3b82f6", // blue
  "#d97706", // amber
  "#8b5cf6", // violet
  "#22d3ee", // cyan
  "#f59e0b", // yellow
  "#93c5fd", // sky
  "#f472b6", // pink
  "#fb923c", // orange
  "#ef4444", // red
];

// Action badge styles
export const ACTION_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  cooperate: { color: "#1bff1b", bg: "rgba(27,255,27,0.06)",   label: "COOPERATE" },
  defect:    { color: "#fb923c", bg: "rgba(251,146,60,0.06)",  label: "DEFECT"    },
  stag:      { color: "#22d3ee", bg: "rgba(34,211,238,0.06)",  label: "STAG"      },
  rabbit:    { color: "#f59e0b", bg: "rgba(245,158,11,0.06)",  label: "RABBIT"    },
};

export type PlayerResultState = "winner" | "loser" | "tie";

interface PlayerCard2Props {
  personaId: number;
  personaName: string;
  playerIndex: number;
  decision: PersonaDecisionEvent | null | undefined;
  lastDiscussion: PersonaDiscussionEvent | null | undefined;
  payoff: number | undefined;
  cumulativeScore: number;
  isCurrentRound: boolean;
  resultState?: PlayerResultState;
  onClick: () => void;
}

/**
 * Portrait-style player card for the 2-column game grid.
 * Score is the hero element — large, player-colored, center-aligned.
 * Status strip at bottom shows current round state.
 */
export function PlayerCard2({
  personaId,
  personaName,
  playerIndex,
  decision,
  lastDiscussion,
  payoff,
  cumulativeScore,
  isCurrentRound,
  resultState,
  onClick,
}: PlayerCard2Props) {
  const color = PLAYER_COLORS[playerIndex] ?? "#ffffff";
  const isWinner = resultState === "winner";
  const isLoser  = resultState === "loser";
  const isTie    = resultState === "tie";

  const hasDecided   = !!decision;
  const hasDiscussed = !!lastDiscussion;
  const actionKey    = (decision?.content as Record<string, string> | undefined)?.action ?? "";
  const actionStyle  = ACTION_STYLE[actionKey];

  const statusState: "deliberating" | "discussing" | "decided" | "idle" =
    hasDecided
      ? "decided"
      : isCurrentRound && hasDiscussed
        ? "discussing"
        : isCurrentRound
          ? "deliberating"
          : "idle";

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col bg-[#09090b] text-left h-[180px]",
        "transition-colors duration-300 hover:bg-zinc-900/60 group cursor-pointer overflow-hidden",
        isLoser && "opacity-40",
      )}
    >
      {/* Top accent border in player color */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[3px] z-10"
        style={{ backgroundColor: color }}
        animate={
          isWinner
            ? { boxShadow: [`0 0 0px ${color}`, `0 0 16px ${color}80`, `0 0 0px ${color}`] }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="flex flex-col h-full pt-4 px-5 pb-4 gap-0">
        {/* ── Identity row ──────────────────────────────── */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="shrink-0 rounded-full p-[2px]"
            style={{ backgroundColor: `${color}20` }}
          >
            <HippyGhostAvatar seed={personaId} className="size-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-EuclidCircularA text-sm font-medium text-white leading-tight truncate">
              {personaName}
            </div>
            <AnimatePresence>
              {(isWinner || isTie) && (
                <motion.div
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 mt-0.5"
                >
                  {isWinner && (
                    <motion.span
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: color }}
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                    />
                  )}
                  <span
                    className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase"
                    style={{ color: isWinner ? color : "#52525b" }}
                  >
                    {isWinner ? "Winner" : "Tie"}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Score — the hero ──────────────────────────── */}
        <div className="flex-1 flex items-center justify-center">
          <motion.span
            key={cumulativeScore}
            initial={{ opacity: 0.5, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="font-EuclidCircularA font-light tabular-nums leading-none select-none"
            style={{
              color,
              fontSize: isWinner ? "3.5rem" : "3rem",
              filter: isWinner ? `drop-shadow(0 0 16px ${color}60)` : undefined,
            }}
          >
            {cumulativeScore}
          </motion.span>
        </div>

        {/* ── Status strip ──────────────────────────────── */}
        <div className="shrink-0 h-7 flex items-center">
          <AnimatePresence mode="wait">
            {statusState === "deliberating" && (
              <motion.div
                key="deliberating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: color }}
                      animate={{ opacity: [0.15, 0.9, 0.15] }}
                      transition={{ duration: 1.4, delay: i * 0.22, repeat: Infinity }}
                    />
                  ))}
                </div>
                <span
                  className="font-IBMPlexMono text-[8px] tracking-[0.16em] uppercase"
                  style={{ color: `${color}50` }}
                >
                  Deliberating
                </span>
              </motion.div>
            )}

            {statusState === "discussing" && (
              <motion.div
                key="discussing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 w-full"
              >
                <span
                  className="shrink-0 font-IBMPlexMono text-[8px] tracking-[0.14em] uppercase px-1.5 py-0.5 border"
                  style={{
                    color: "#f59e0b",
                    borderColor: "rgba(245,158,11,0.25)",
                    background: "rgba(245,158,11,0.04)",
                  }}
                >
                  Speaking
                </span>
                <p className="font-EuclidCircularA text-[11px] text-zinc-500 truncate leading-none">
                  {lastDiscussion!.content}
                </p>
              </motion.div>
            )}

            {statusState === "decided" && (
              <motion.div
                key="decided"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="flex items-center justify-between gap-2 w-full"
              >
                <div
                  className="inline-flex items-center px-2 py-1 border"
                  style={
                    actionStyle
                      ? { borderColor: `${actionStyle.color}35`, background: actionStyle.bg }
                      : { borderColor: "rgba(255,255,255,0.08)", background: "transparent" }
                  }
                >
                  <span
                    className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase font-medium"
                    style={{ color: actionStyle?.color ?? "#71717a" }}
                  >
                    {(actionStyle?.label ?? actionKey) || "—"}
                  </span>
                </div>

                {payoff !== undefined && (
                  <span
                    className="font-EuclidCircularA text-base font-light tabular-nums"
                    style={{ color: payoff > 0 ? "#1bff1b" : "#ef4444" }}
                  >
                    +{payoff}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom hover accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: `${color}20` }}
      />
    </button>
  );
}
