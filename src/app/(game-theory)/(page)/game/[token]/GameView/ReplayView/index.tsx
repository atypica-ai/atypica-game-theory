"use client";

import { GameSessionDetail } from "@/app/(game-theory)/actions";
import { GameSessionTimeline } from "@/app/(game-theory)/types";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { PlayerCard, PlayerCardIdle, PlayerResultState, PLAYER_COLORS } from "../PlayerCard";
import { ReplayIntro } from "./ReplayIntro";
import { useGameReplay } from "./useGameReplay";

function formatGameTypeName(key: string): string {
  return key
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export function ReplayView({ initialData }: { initialData: GameSessionDetail }) {
  const { gameType, token } = initialData;
  const timeline = initialData.timeline as GameSessionTimeline;

  const participants = timeline.meta?.participants ?? [];
  const allRounds = timeline.rounds ?? [];

  const { displayState, isIntroComplete, startPlayback, skipToEnd, seek } =
    useGameReplay(timeline);

  const {
    currentRoundId,
    playersDeliberating,
    playersRevealed,
    showPayoffsForRound,
    visibleCompletedRounds,
    progress,
    phase,
  } = displayState;

  const isComplete = phase === "complete";

  // The round currently being replayed
  const displayRoundId = currentRoundId ?? showPayoffsForRound;
  const displayRound =
    displayRoundId !== null ? (allRounds.find((r) => r.roundId === displayRoundId) ?? null) : null;

  // Cumulative scores from completed rounds only (grows as replay advances)
  const cumulativeScores = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const r of visibleCompletedRounds) {
      for (const [pid, v] of Object.entries(r.payoffs)) {
        scores[pid] = (scores[pid] ?? 0) + v;
      }
    }
    return scores;
  }, [visibleCompletedRounds]);

  // Final scores (full game — used only when complete)
  const finalScores = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const r of allRounds) {
      for (const [pid, v] of Object.entries(r.payoffs ?? {})) {
        scores[pid] = (scores[pid] ?? 0) + v;
      }
    }
    return scores;
  }, [allRounds]);

  const { winner, winnerIndex } = useMemo(() => {
    if (!isComplete || participants.length === 0) return { winner: null, winnerIndex: -1 };
    const maxScore = Math.max(...participants.map((p) => finalScores[p.playerId] ?? 0));
    const leaders = participants.filter((p) => (finalScores[p.playerId] ?? 0) === maxScore);
    if (leaders.length === participants.length) return { winner: "TIE" as const, winnerIndex: -1 };
    const idx = participants.indexOf(leaders[0]);
    return { winner: leaders[0].name, winnerIndex: idx };
  }, [isComplete, participants, finalScores]);

  const winnerColor =
    winner && winner !== "TIE" ? (PLAYER_COLORS[winnerIndex] ?? "#1bff1b") : "#d97706";

  function getResultState(playerId: string): PlayerResultState | undefined {
    if (!isComplete) return undefined;
    if (winner === "TIE") return "tie";
    const p = participants.find((x) => x.playerId === playerId);
    if (!p) return undefined;
    return p.name === winner ? "winner" : "loser";
  }

  const replayRoundNumber = displayRound?.roundId ?? visibleCompletedRounds.length;

  // When complete, show final scores; otherwise show replay-accumulated scores
  const displayScores = isComplete ? finalScores : cumulativeScores;

  return (
    <div className="h-screen flex flex-col bg-[#09090b] overflow-hidden relative">
      {/* ── Arena intro overlay ───────────────────────────────────── */}
      <ReplayIntro
        gameTypeName={formatGameTypeName(gameType)}
        participants={participants}
        onStart={startPlayback}
      />

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="shrink-0 h-[52px] flex items-center justify-between px-8 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <span className="font-IBMPlexMono text-[8px] tracking-[0.22em] uppercase text-zinc-700">
            Game Theory
          </span>
          <span className="w-px h-3 bg-zinc-800" />
          <span className="font-EuclidCircularA text-sm font-medium text-white">
            {formatGameTypeName(gameType)}
          </span>
        </div>

        <div className="flex items-center gap-5">
          {replayRoundNumber > 0 && (
            <span className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase text-zinc-600">
              Round {replayRoundNumber}
            </span>
          )}

          <div className="flex items-center gap-2">
            <span className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase text-zinc-600">
              {isComplete ? "Complete" : isIntroComplete ? "Replay" : "Ready"}
            </span>
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isComplete ? "#3f3f46" : "#1bff1b" }}
              animate={
                isIntroComplete && !isComplete
                  ? { boxShadow: ["0 0 0px #1bff1b", "0 0 8px #1bff1b", "0 0 0px #1bff1b"] }
                  : {}
              }
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>

          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                void navigator.clipboard.writeText(
                  `${window.location.origin}/game/${token}/replay`,
                );
              }
            }}
            className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-700 hover:text-zinc-400 transition-colors"
          >
            Copy Link
          </button>
        </div>
      </header>

      {/* ── Result banner (appears when complete) ─────────────────── */}
      <AnimatePresence>
        {isComplete && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="shrink-0 h-8 flex items-center justify-center gap-4 border-b border-white/[0.04]"
            style={{ background: `${winnerColor}08` }}
          >
            <div
              className="flex-1 h-px max-w-24"
              style={{ backgroundColor: `${winnerColor}20` }}
            />
            <span
              className="font-IBMPlexMono text-[10px] tracking-[0.22em] uppercase"
              style={{ color: winnerColor }}
            >
              {winner === "TIE" ? "Tie · Equal Scores" : `${winner} · Wins`}
            </span>
            <div
              className="flex-1 h-px max-w-24"
              style={{ backgroundColor: `${winnerColor}20` }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Player arena ──────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 grid gap-px"
        style={{
          backgroundColor: "rgba(255,255,255,0.035)",
          gridTemplateColumns: `repeat(${Math.max(participants.length, 1)}, 1fr)`,
        }}
      >
        {participants.map((participant, idx) => {
          const resultState = getResultState(participant.playerId);
          const cumScore = displayScores[participant.playerId] ?? 0;
          const isDeliberating = playersDeliberating.has(participant.playerId);
          const isRevealed = playersRevealed.has(participant.playerId);

          // Idle — before any round or between rounds and not in active set
          if (!isDeliberating && !isRevealed && !displayRound) {
            return (
              <PlayerCardIdle
                key={participant.playerId}
                personaId={participant.personaId}
                personaName={participant.name}
                playerId={participant.playerId}
                playerIndex={idx}
                cumulativeScore={cumScore}
                resultState={resultState}
              />
            );
          }

          // Deliberating — spinner
          if (isDeliberating) {
            return (
              <PlayerCard
                key={participant.playerId}
                personaId={participant.personaId}
                personaName={participant.name}
                playerId={participant.playerId}
                playerIndex={idx}
                record={{ reasoning: null, words: null, actions: [] }}
                payoff={undefined}
                cumulativeScore={cumScore}
                isCurrentRound={true}
                resultState={resultState}
              />
            );
          }

          // Revealed — show action (payoff only after payoff step)
          if (isRevealed && displayRound) {
            const record = displayRound.players[participant.playerId];
            const payoff =
              showPayoffsForRound === displayRound.roundId
                ? displayRound.payoffs[participant.playerId]
                : undefined;
            return (
              <PlayerCard
                key={participant.playerId}
                personaId={participant.personaId}
                personaName={participant.name}
                playerId={participant.playerId}
                playerIndex={idx}
                record={record}
                payoff={payoff}
                cumulativeScore={cumScore}
                isCurrentRound={true}
                resultState={resultState}
              />
            );
          }

          // In active round but not yet reached this player's step
          if (displayRound) {
            return (
              <PlayerCardIdle
                key={participant.playerId}
                personaId={participant.personaId}
                personaName={participant.name}
                playerId={participant.playerId}
                playerIndex={idx}
                cumulativeScore={cumScore}
                resultState={resultState}
              />
            );
          }

          return (
            <PlayerCardIdle
              key={participant.playerId}
              personaId={participant.personaId}
              personaName={participant.name}
              playerId={participant.playerId}
              playerIndex={idx}
              cumulativeScore={cumScore}
              resultState={resultState}
            />
          );
        })}
      </div>

      {/* ── Control bar — Skip only (no round nav during replay) ──── */}
      <div className="shrink-0 h-10 flex items-center gap-4 px-6 border-t border-white/[0.05]">
        {/* Progress track */}
        <div className="flex-1 relative h-px bg-zinc-800">
          <div
            className="absolute left-0 top-0 h-full transition-none"
            style={{ width: `${progress}%`, backgroundColor: "rgba(27,255,27,0.6)" }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(progress)}
            onChange={(e) => seek(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <span className="font-IBMPlexMono text-[9px] tracking-[0.1em] text-zinc-700 tabular-nums w-7 text-right">
          {Math.round(progress)}%
        </span>

        {/* Skip to end */}
        {!isComplete && (
          <button
            onClick={skipToEnd}
            className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Skip →
          </button>
        )}
      </div>
    </div>
  );
}
