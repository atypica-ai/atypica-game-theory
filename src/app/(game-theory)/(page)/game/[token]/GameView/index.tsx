"use client";

import { fetchGameSession, GameSessionDetail } from "@/app/(game-theory)/actions";
import { GameSessionTimeline } from "@/app/(game-theory)/types";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import useSWR from "swr";
import { PlayerCard, PlayerCardIdle, PLAYER_COLORS } from "./PlayerCard";
import { RoundView } from "./RoundView";

function formatGameTypeName(key: string): string {
  return key
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export function GameView({
  initialData,
  token,
}: {
  initialData: GameSessionDetail;
  token: string;
}) {
  const { data } = useSWR(
    ["game:session", token],
    async () => {
      const result = await fetchGameSession(token);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      fallbackData: initialData,
      refreshInterval: (data) => (data?.status === "completed" ? 0 : 2000),
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const session = data ?? initialData;
  const { status, gameType } = session;
  const timeline = session.timeline as GameSessionTimeline;

  const participants = timeline.meta?.participants ?? [];
  const allRounds = timeline.rounds ?? [];

  const completedRounds = useMemo(
    () => allRounds.filter((r) => Object.keys(r.payoffs).length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(allRounds)],
  );

  const activeRound = useMemo(() => {
    if (allRounds.length === 0) return null;
    const last = allRounds[allRounds.length - 1];
    return Object.keys(last.payoffs).length === 0 ? last : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allRounds)]);

  const displayRound = activeRound ?? completedRounds[completedRounds.length - 1] ?? null;

  const cumulativeScores = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const r of completedRounds) {
      for (const [pid, v] of Object.entries(r.payoffs)) {
        scores[pid] = (scores[pid] ?? 0) + v;
      }
    }
    return scores;
  }, [completedRounds]);

  const isCompleted = status === "completed";
  const isPending = status === "pending" || participants.length === 0;

  // Determine winner when completed
  const winner = useMemo(() => {
    if (!isCompleted || participants.length === 0) return null;
    const maxScore = Math.max(...participants.map((p) => cumulativeScores[p.playerId] ?? 0));
    const leaders = participants.filter((p) => (cumulativeScores[p.playerId] ?? 0) === maxScore);
    if (leaders.length === participants.length) return "TIE";
    return leaders[0].name;
  }, [isCompleted, participants, cumulativeScores]);

  const currentRoundNumber = activeRound?.roundId ?? completedRounds.length;

  return (
    <div className="h-screen flex flex-col bg-[#09090b] overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="shrink-0 h-[52px] flex items-center justify-between px-8 border-b border-white/[0.05]">
        {/* Left: game identity */}
        <div className="flex items-center gap-3">
          <span className="font-IBMPlexMono text-[8px] tracking-[0.22em] uppercase text-zinc-700">
            Game Theory
          </span>
          <span className="w-px h-3 bg-zinc-800" />
          <span className="font-EuclidCircularA text-sm font-medium text-white">
            {formatGameTypeName(gameType)}
          </span>
          {isCompleted && winner && (
            <>
              <span className="w-px h-3 bg-zinc-800" />
              <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-500">
                {winner === "TIE" ? "Tied" : `${winner} wins`}
              </span>
            </>
          )}
        </div>

        {/* Right: round counter + live status */}
        <div className="flex items-center gap-5">
          {!isPending && currentRoundNumber > 0 && (
            <span className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase text-zinc-600">
              Round {currentRoundNumber}
            </span>
          )}
          <div className="flex items-center gap-2">
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isCompleted
                  ? "#3f3f46"
                  : isPending
                    ? "#3f3f46"
                    : "#1bff1b",
              }}
              animate={
                !isCompleted && !isPending
                  ? { boxShadow: ["0 0 0px #1bff1b", "0 0 8px #1bff1b", "0 0 0px #1bff1b"] }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase text-zinc-600">
              {isCompleted ? "Complete" : isPending ? "Pending" : "Live"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Player arena ────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 grid gap-px"
        style={{
          backgroundColor: "rgba(255,255,255,0.035)",
          gridTemplateColumns: `repeat(${Math.max(participants.length, 1)}, 1fr)`,
        }}
      >
        {isPending ? (
          /* Initializing state */
          <div
            className="col-span-full flex flex-col items-center justify-center gap-4"
            style={{ gridColumn: "1 / -1" }}
          >
            <div className="flex items-center gap-2.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-zinc-700"
                  animate={{ opacity: [0.15, 1, 0.15] }}
                  transition={{ duration: 1.4, delay: i * 0.25, repeat: Infinity }}
                />
              ))}
            </div>
            <span className="font-IBMPlexMono text-[9px] tracking-[0.22em] uppercase text-zinc-700">
              Awaiting players
            </span>
          </div>
        ) : (
          participants.map((participant, idx) => {
            if (!displayRound) {
              return (
                <PlayerCardIdle
                  key={participant.playerId}
                  personaId={participant.personaId}
                  personaName={participant.name}
                  playerId={participant.playerId}
                  playerIndex={idx}
                  cumulativeScore={cumulativeScores[participant.playerId] ?? 0}
                />
              );
            }

            return (
              <PlayerCard
                key={participant.playerId}
                personaId={participant.personaId}
                personaName={participant.name}
                playerId={participant.playerId}
                playerIndex={idx}
                record={displayRound.players[participant.playerId]}
                payoff={displayRound.payoffs[participant.playerId]}
                cumulativeScore={cumulativeScores[participant.playerId] ?? 0}
                isCurrentRound={!!activeRound}
              />
            );
          })
        )}
      </div>

      {/* ── History strip ───────────────────────────────────────── */}
      {completedRounds.length > 0 && timeline.meta && (
        <div className="shrink-0 border-t border-white/[0.05]">
          {/* History header row */}
          <div className="flex items-center justify-between px-8 h-9 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
              <span className="font-IBMPlexMono text-[8px] tracking-[0.22em] uppercase text-zinc-700">
                History
              </span>
              <span className="font-IBMPlexMono text-[8px] text-zinc-800">
                {completedRounds.length} round{completedRounds.length !== 1 ? "s" : ""}
              </span>
            </div>
            {/* Per-player score totals */}
            <div className="flex items-center gap-5">
              {participants.map((p, idx) => {
                const color = PLAYER_COLORS[idx] ?? "#ffffff";
                return (
                  <span
                    key={p.playerId}
                    className="font-IBMPlexMono text-[9px] tabular-nums"
                    style={{ color: `${color}80` }}
                  >
                    {p.name.split(" ")[0]}&nbsp;{cumulativeScores[p.playerId] ?? 0}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Scrollable round log — newest at top */}
          <div className="overflow-y-auto flex flex-col gap-px" style={{ maxHeight: "220px" }}>
            <AnimatePresence initial={false}>
              {[...completedRounds].reverse().map((round) => (
                <motion.div
                  key={round.roundId}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <RoundView round={round} meta={timeline.meta!} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
