"use client";

import { PersonaDecisionEvent } from "@/app/(game-theory)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";

// Player A = ghost-green, Player B = blue
export const PLAYER_COLORS = ["#1bff1b", "#3b82f6"];

// Action badge colors — extend this map when adding new game types
const ACTION_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  cooperate: { color: "#1bff1b", bg: "rgba(27,255,27,0.05)", label: "COOPERATE" },
  defect: { color: "#fb923c", bg: "rgba(251,146,60,0.05)", label: "DEFECT" },
};

export type PlayerResultState = "winner" | "loser" | "tie";

interface PlayerCardProps {
  personaId: number;
  personaName: string;
  playerIndex: number;
  decision: PersonaDecisionEvent | null | undefined;
  payoff: number | undefined;
  cumulativeScore: number;
  isCurrentRound: boolean;
  resultState?: PlayerResultState;
}

export function PlayerCard({
  personaId,
  personaName,
  playerIndex,
  decision,
  payoff,
  cumulativeScore,
  isCurrentRound,
  resultState,
}: PlayerCardProps) {
  const color = PLAYER_COLORS[playerIndex] ?? "#ffffff";
  const hasDecided = !!decision;
  const actionKey = (decision?.content as Record<string, string> | undefined)?.action ?? "";
  const actionStyle = ACTION_STYLE[actionKey];

  const isWinner = resultState === "winner";
  const isLoser = resultState === "loser";
  const isTie = resultState === "tie";

  return (
    <div
      className={cn(
        "relative flex flex-col h-full overflow-hidden bg-[#09090b] transition-opacity duration-700",
        isLoser && "opacity-50",
      )}
    >
      {/* Player-color left bar — pulses for winner */}
      <motion.div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ backgroundColor: color }}
        animate={
          isWinner
            ? { boxShadow: [`0 0 0px ${color}`, `0 0 14px ${color}`, `0 0 0px ${color}`] }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity }}
      />

      <div className="pl-8 pr-6 pt-8 pb-6 flex flex-col h-full">
        {/* Identity */}
        <div className="flex items-center gap-3 mb-5">
          <HippyGhostAvatar seed={personaId} className="size-9 shrink-0" />
          <div className="min-w-0">
            <div className="font-EuclidCircularA text-lg font-medium text-white leading-none truncate">
              {personaName}
            </div>
          </div>
        </div>

        {/* Result badge — winner / tie */}
        <AnimatePresence>
          {(isWinner || isTie) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 mb-3"
            >
              {isWinner && (
                <>
                  <motion.span
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: color }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <span
                    className="font-IBMPlexMono text-[8px] tracking-[0.2em] uppercase"
                    style={{ color }}
                  >
                    Winner
                  </span>
                </>
              )}
              {isTie && (
                <span className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase text-zinc-600">
                  Tie
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cumulative score */}
        <div className="mb-6">
          <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-700 block mb-1">
            Score
          </span>
          <motion.div
            key={cumulativeScore}
            initial={{ opacity: 0.5, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <span
              className="font-EuclidCircularA font-light leading-none tabular-nums"
              style={{
                color,
                fontSize: isWinner ? "3.75rem" : "3rem",
                filter: isWinner ? `drop-shadow(0 0 18px ${color}80)` : undefined,
              }}
            >
              {cumulativeScore}
            </span>
          </motion.div>
        </div>

        {/* State area */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {isCurrentRound && !hasDecided ? (
              /* ── DELIBERATING ─────────────────────────────────────── */
              <motion.div
                key="deliberating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center gap-2.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: color }}
                      animate={{ opacity: [0.15, 1, 0.15] }}
                      transition={{ duration: 1.4, delay: i * 0.25, repeat: Infinity }}
                    />
                  ))}
                  <span
                    className="font-IBMPlexMono text-[10px] tracking-[0.18em] uppercase"
                    style={{ color: `${color}50` }}
                  >
                    Deliberating
                  </span>
                </div>
                <div
                  className="font-EuclidCircularA font-light text-[6rem] leading-none select-none mt-2"
                  style={{ color: `${color}08` }}
                  aria-hidden
                >
                  ?
                </div>
              </motion.div>
            ) : hasDecided ? (
              /* ── DECIDED ──────────────────────────────────────────── */
              <motion.div
                key="decided"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col gap-4 overflow-y-auto"
              >
                {/* Private reasoning — spectator's exclusive window */}
                {decision.reasoning && (
                  <div
                    className="p-3 border border-white/[0.04]"
                    style={{ background: "rgba(27,255,27,0.02)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase"
                        style={{ color: "rgba(27,255,27,0.3)" }}
                      >
                        Intercepted · Private
                      </span>
                      <span
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: "rgba(27,255,27,0.3)" }}
                      />
                    </div>
                    <p className="font-IBMPlexMono text-[10px] leading-relaxed text-zinc-500 line-clamp-5">
                      {decision.reasoning}
                    </p>
                  </div>
                )}

                {/* Decision badge */}
                {actionStyle && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: 0.1 }}
                  >
                    <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-700 block mb-2">
                      Decision
                    </span>
                    <div
                      className="inline-flex items-center px-4 py-2 border"
                      style={{
                        borderColor: `${actionStyle.color}35`,
                        background: actionStyle.bg,
                      }}
                    >
                      <span
                        className="font-IBMPlexMono text-sm tracking-[0.14em] uppercase font-medium"
                        style={{ color: actionStyle.color }}
                      >
                        {actionStyle.label}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Round payoff delta */}
                {payoff !== undefined && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="flex items-baseline gap-2"
                  >
                    <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-700">
                      This round
                    </span>
                    <span
                      className="font-EuclidCircularA text-2xl font-light tabular-nums"
                      style={{
                        color:
                          payoff >= 51 ? "#1bff1b" : payoff >= 39 ? "#d97706" : "#ef4444",
                      }}
                    >
                      +{payoff}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function PlayerCardIdle({
  personaId,
  personaName,
  playerIndex,
  cumulativeScore,
  resultState,
}: {
  personaId: number;
  personaName: string;
  playerIndex: number;
  cumulativeScore: number;
  resultState?: PlayerResultState;
}) {
  const color = PLAYER_COLORS[playerIndex] ?? "#ffffff";
  const isWinner = resultState === "winner";
  const isLoser = resultState === "loser";
  const isTie = resultState === "tie";

  return (
    <div
      className={cn(
        "relative flex flex-col h-full bg-[#09090b] transition-opacity duration-700",
        isLoser && "opacity-50",
      )}
    >
      <motion.div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ backgroundColor: color }}
        animate={
          isWinner
            ? { boxShadow: [`0 0 0px ${color}`, `0 0 14px ${color}`, `0 0 0px ${color}`] }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity }}
      />
      <div className="pl-8 pr-6 pt-8 pb-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <HippyGhostAvatar seed={personaId} className="size-9 shrink-0" />
          <div className="min-w-0">
            <div className="font-EuclidCircularA text-lg font-medium text-white truncate">
              {personaName}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {(isWinner || isTie) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2"
            >
              {isWinner && (
                <>
                  <motion.span
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: color }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <span
                    className="font-IBMPlexMono text-[8px] tracking-[0.2em] uppercase"
                    style={{ color }}
                  >
                    Winner
                  </span>
                </>
              )}
              {isTie && (
                <span className="font-IBMPlexMono text-[8px] tracking-[0.18em] uppercase text-zinc-600">
                  Tie
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-700 block mb-1">
            Score
          </span>
          <span
            className="font-EuclidCircularA font-light leading-none tabular-nums"
            style={{
              color,
              fontSize: isWinner ? "3.75rem" : "3rem",
              filter: isWinner ? `drop-shadow(0 0 18px ${color}80)` : undefined,
            }}
          >
            {cumulativeScore}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PlayerCardCompact({
  personaId,
  personaName,
  playerIndex,
  decision,
  payoff,
}: {
  personaId: number;
  personaName: string;
  playerIndex: number;
  decision: PersonaDecisionEvent | null | undefined;
  payoff: number | undefined;
}) {
  const color = PLAYER_COLORS[playerIndex] ?? "#ffffff";
  const actionKey = (decision?.content as Record<string, string> | undefined)?.action ?? "";
  const actionStyle = ACTION_STYLE[actionKey];

  return (
    <div className="flex items-center gap-3 px-5 py-3 flex-1 min-w-0 bg-[#09090b]">
      <HippyGhostAvatar seed={personaId} className="size-5 shrink-0" />
      <span
        className="font-EuclidCircularA text-xs font-medium truncate"
        style={{ color: `${color}cc` }}
      >
        {personaName}
      </span>
      {actionStyle && (
        <span
          className="font-IBMPlexMono text-[9px] tracking-[0.12em] uppercase shrink-0"
          style={{ color: actionStyle.color }}
        >
          {actionStyle.label}
        </span>
      )}
      {payoff !== undefined && (
        <span className="font-EuclidCircularA text-sm font-light tabular-nums shrink-0 text-zinc-500 ml-auto">
          +{payoff}
        </span>
      )}
    </div>
  );
}
