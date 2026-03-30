"use client";

import { PersonaDecisionEvent, PersonaDiscussionEvent } from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

// 10 unique accent colors — one per player slot, from the style.md palette
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

// Action badge styles — extend when adding new game types
export const ACTION_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  cooperate: { color: "#1bff1b", bg: "rgba(27,255,27,0.05)",   label: "COOPERATE" },
  defect:    { color: "#fb923c", bg: "rgba(251,146,60,0.05)",  label: "DEFECT"    },
  stag:      { color: "#22d3ee", bg: "rgba(34,211,238,0.05)",  label: "STAG"      },
  rabbit:    { color: "#f59e0b", bg: "rgba(245,158,11,0.05)",  label: "RABBIT"    },
};

export type PlayerResultState = "winner" | "loser" | "tie";

interface PlayerNodeProps {
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
 * Compact player dossier card. Supports 3 live status states:
 *   deliberating → discussing → decided
 * Adapts to any number of players in an auto-fill grid.
 */
export function PlayerNode({
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
}: PlayerNodeProps) {
  const color = PLAYER_COLORS[playerIndex] ?? "#ffffff";
  const isWinner = resultState === "winner";
  const isLoser  = resultState === "loser";

  const hasDecided   = !!decision;
  const hasDiscussed = !!lastDiscussion;
  const actionKey    = (decision?.content as Record<string, string> | undefined)?.action ?? "";
  const actionStyle  = ACTION_STYLE[actionKey];

  // Three live states; "idle" when there's nothing to show (e.g. pre-game or history round with no data)
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
        "relative flex flex-col h-full bg-[#09090b] text-left",
        "transition-colors duration-300 hover:bg-zinc-900/50 group cursor-pointer",
        isLoser && "opacity-40",
      )}
    >
      {/* Player-color left accent bar — glows for winner */}
      <motion.div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ backgroundColor: color }}
        animate={
          isWinner
            ? { boxShadow: [`0 0 0px ${color}`, `0 0 18px ${color}`, `0 0 0px ${color}`] }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="pl-5 pr-4 pt-4 pb-4 flex flex-col h-full gap-3 min-h-0">
        {/* ── Identity row ─────────────────────────────────── */}
        <div className="flex items-start gap-2.5">
          <HippyGhostAvatar seed={personaId} className="size-7 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-EuclidCircularA text-sm font-medium text-white leading-tight truncate">
              {personaName}
            </div>
            <AnimatePresence>
              {(isWinner || resultState === "tie") && (
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

          {/* Cumulative score — top right, player-colored */}
          <motion.span
            key={cumulativeScore}
            initial={{ opacity: 0.4, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="font-EuclidCircularA font-light tabular-nums leading-none shrink-0"
            style={{
              color,
              fontSize: isWinner ? "2rem" : "1.75rem",
              filter: isWinner ? `drop-shadow(0 0 12px ${color}60)` : undefined,
            }}
          >
            {cumulativeScore}
          </motion.span>
        </div>

        {/* ── Status area ───────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col justify-end">
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
                  className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase"
                  style={{ color: `${color}50` }}
                >
                  Deliberating
                </span>
              </motion.div>
            )}

            {statusState === "discussing" && (
              <motion.div
                key="discussing"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-1.5"
              >
                <span
                  className="font-IBMPlexMono text-[8px] tracking-[0.14em] uppercase px-1.5 py-0.5 border w-fit"
                  style={{
                    color: "#f59e0b",
                    borderColor: "rgba(245,158,11,0.25)",
                    background: "rgba(245,158,11,0.04)",
                  }}
                >
                  Speaking
                </span>
                <p className="font-InstrumentSerif italic text-[11px] text-zinc-400 leading-snug line-clamp-2">
                  &ldquo;{lastDiscussion!.content}&rdquo;
                </p>
              </motion.div>
            )}

            {statusState === "decided" && (
              <motion.div
                key="decided"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="flex items-center justify-between gap-2"
              >
                {/* Action badge */}
                <div
                  className="inline-flex items-center px-2.5 py-1 border"
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

                {/* Round payoff */}
                {payoff !== undefined && (
                  <span
                    className="font-EuclidCircularA text-xl font-light tabular-nums"
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
        className="absolute bottom-0 left-3 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: `${color}18` }}
      />
    </button>
  );
}
