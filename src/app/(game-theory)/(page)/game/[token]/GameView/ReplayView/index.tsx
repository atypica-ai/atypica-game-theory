"use client";

import { GameSessionDetail } from "@/app/(game-theory)/actions";
import { GameSessionTimeline } from "@/app/(game-theory)/types";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { PlayerCard, PlayerCardIdle, PLAYER_COLORS } from "../PlayerCard";
import { RoundView } from "../RoundView";
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

  // The round currently being replayed (either in-progress or last shown)
  const displayRoundId = currentRoundId ?? showPayoffsForRound;
  const displayRound = displayRoundId !== null
    ? (allRounds.find((r) => r.roundId === displayRoundId) ?? null)
    : null;

  // Cumulative scores from completed rounds only
  const cumulativeScores = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const r of visibleCompletedRounds) {
      for (const [pid, v] of Object.entries(r.payoffs)) {
        scores[pid] = (scores[pid] ?? 0) + v;
      }
    }
    return scores;
  }, [visibleCompletedRounds]);

  const replayRoundNumber = displayRound?.roundId ?? visibleCompletedRounds.length;
  const isComplete = phase === "complete";

  // Winner (shown when replay reaches the end)
  const winner = useMemo(() => {
    if (!isComplete || participants.length === 0) return null;
    const allCompletedRounds = allRounds.filter((r) => Object.keys(r.payoffs).length > 0);
    const finalScores: Record<string, number> = {};
    for (const r of allCompletedRounds) {
      for (const [pid, v] of Object.entries(r.payoffs)) {
        finalScores[pid] = (finalScores[pid] ?? 0) + v;
      }
    }
    const maxScore = Math.max(...participants.map((p) => finalScores[p.playerId] ?? 0));
    const leaders = participants.filter((p) => (finalScores[p.playerId] ?? 0) === maxScore);
    if (leaders.length === participants.length) return "TIE";
    return leaders[0].name;
  }, [isComplete, participants, allRounds]);

  return (
    <div className="h-screen flex flex-col bg-[#09090b] overflow-hidden relative">
      {/* ── Intro overlay ──────────────────────────────────────────── */}
      <ReplayIntro
        gameTypeName={formatGameTypeName(gameType)}
        onComplete={startPlayback}
      />

      {/* ── Header ────────────────────────────────────────────────── */}
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
          {isComplete && winner && (
            <>
              <span className="w-px h-3 bg-zinc-800" />
              <span className="font-IBMPlexMono text-[9px] tracking-[0.14em] uppercase text-zinc-500">
                {winner === "TIE" ? "Tied" : `${winner} wins`}
              </span>
            </>
          )}
        </div>

        {/* Right: round indicator + replay badge */}
        <div className="flex items-center gap-5">
          {replayRoundNumber > 0 && (
            <span className="font-IBMPlexMono text-[9px] tracking-[0.16em] uppercase text-zinc-600">
              Round {replayRoundNumber}
            </span>
          )}

          {/* REPLAY badge — always visible, replaces live dot */}
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

          {/* Share link for this replay */}
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

      {/* ── Player arena ──────────────────────────────────────────── */}
      <div
        className="flex-1 min-h-0 grid gap-px"
        style={{
          backgroundColor: "rgba(255,255,255,0.035)",
          gridTemplateColumns: `repeat(${Math.max(participants.length, 1)}, 1fr)`,
        }}
      >
        {participants.map((participant, idx) => {
          const isDeliberating = playersDeliberating.has(participant.playerId);
          const isRevealed = playersRevealed.has(participant.playerId);
          const cumScore = cumulativeScores[participant.playerId] ?? 0;

          // Idle — before any round starts
          if (!isDeliberating && !isRevealed && !displayRound) {
            return (
              <PlayerCardIdle
                key={participant.playerId}
                personaId={participant.personaId}
                personaName={participant.name}
                playerId={participant.playerId}
                playerIndex={idx}
                cumulativeScore={cumScore}
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
              />
            );
          }

          // Revealed — show action (with payoff if payoffs step reached)
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
              />
            );
          }

          // In-round but not yet deliberating or revealed (earlier players are out, later haven't started)
          if (displayRound) {
            return (
              <PlayerCardIdle
                key={participant.playerId}
                personaId={participant.personaId}
                personaName={participant.name}
                playerId={participant.playerId}
                playerIndex={idx}
                cumulativeScore={cumScore}
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
            />
          );
        })}
      </div>

      {/* ── History strip ─────────────────────────────────────────── */}
      {visibleCompletedRounds.length > 0 && timeline.meta && (
        <div className="shrink-0 border-t border-white/[0.05]">
          {/* Header row */}
          <div className="flex items-center justify-between px-8 h-9 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
              <span className="font-IBMPlexMono text-[8px] tracking-[0.22em] uppercase text-zinc-700">
                History
              </span>
              <span className="font-IBMPlexMono text-[8px] text-zinc-800">
                {visibleCompletedRounds.length} round
                {visibleCompletedRounds.length !== 1 ? "s" : ""}
              </span>
            </div>
            {/* Cumulative scores per player */}
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
              {[...visibleCompletedRounds].reverse().map((round) => (
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

      {/* ── Replay control bar ────────────────────────────────────── */}
      <div className="shrink-0 h-10 flex items-center gap-4 px-6 border-t border-white/[0.05]">
        {/* Progress track */}
        <div className="flex-1 relative h-px bg-zinc-800">
          <div
            className="absolute left-0 top-0 h-full transition-none"
            style={{
              width: `${progress}%`,
              backgroundColor: "rgba(27,255,27,0.6)",
            }}
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

        {/* Progress percentage */}
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
