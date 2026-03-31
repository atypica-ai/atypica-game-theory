"use client";

import { GameSessionDetail } from "@/app/(game-theory)/actions";
import {
  GameSessionParticipant,
  PersonaDecisionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { PlayerCard2, PlayerResultState, PLAYER_COLORS } from "../PlayerCard";
import { ReplayIntro } from "./ReplayIntro";
import { useGameReplay } from "./useGameReplay";

function formatGameTypeName(key: string): string {
  return key.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
}

export function ReplayView({ initialData }: { initialData: GameSessionDetail }) {
  const { gameType, token, events, extra } = initialData;
  const participants: GameSessionParticipant[] = useMemo(
    () => extra?.participants ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(extra?.participants)],
  );

  const { displayState, isIntroComplete, startPlayback, skipToEnd, seek } = useGameReplay(
    events,
    participants,
  );

  const {
    currentRoundId,
    playersDeliberating,
    playersRevealed,
    showPayoffsForRound,
    visibleCompletedRoundIds,
    progress,
    phase,
  } = displayState;

  const isComplete = phase === "complete";

  const cumulativeScores = useMemo(() => {
    const scores: Record<number, number> = {};
    for (const e of events) {
      if (e.type === "round-result" && visibleCompletedRoundIds.has(e.round)) {
        const ev = e as RoundResultEvent;
        for (const [id, v] of Object.entries(ev.payoffs)) {
          const numId = Number(id);
          scores[numId] = (scores[numId] ?? 0) + v;
        }
      }
    }
    return scores;
  }, [events, visibleCompletedRoundIds]);

  const finalScores = useMemo(() => {
    const scores: Record<number, number> = {};
    for (const e of events) {
      if (e.type === "round-result") {
        const ev = e as RoundResultEvent;
        for (const [id, v] of Object.entries(ev.payoffs)) {
          const numId = Number(id);
          scores[numId] = (scores[numId] ?? 0) + v;
        }
      }
    }
    return scores;
  }, [events]);

  const { winner, winnerIndex } = useMemo(() => {
    if (!isComplete || participants.length === 0) return { winner: null, winnerIndex: -1 };
    const maxScore = Math.max(...participants.map((p) => finalScores[p.personaId] ?? 0));
    const leaders = participants.filter((p) => (finalScores[p.personaId] ?? 0) === maxScore);
    if (leaders.length === participants.length) return { winner: "TIE" as const, winnerIndex: -1 };
    const idx = participants.indexOf(leaders[0]);
    return { winner: leaders[0].name, winnerIndex: idx };
  }, [isComplete, participants, finalScores]);

  const winnerColor =
    winner && winner !== "TIE" ? (PLAYER_COLORS[winnerIndex] ?? "var(--gt-pos)") : "var(--gt-warn)";

  function getResultState(personaId: number): PlayerResultState | undefined {
    if (!isComplete) return undefined;
    if (winner === "TIE") return "tie";
    const p = participants.find((x) => x.personaId === personaId);
    if (!p) return undefined;
    return p.name === winner ? "winner" : "loser";
  }

  const displayScores = isComplete ? finalScores : cumulativeScores;

  function getDecisionForReplay(personaId: number): PersonaDecisionEvent | null {
    if (currentRoundId === null) return null;
    return (
      (events.find(
        (e) =>
          e.type === "persona-decision" &&
          e.personaId === personaId &&
          e.round === currentRoundId,
      ) as PersonaDecisionEvent | undefined) ?? null
    );
  }

  function getPayoffForReplay(personaId: number): number | undefined {
    if (showPayoffsForRound === null) return undefined;
    const e = events.find(
      (ev): ev is RoundResultEvent =>
        ev.type === "round-result" && ev.round === showPayoffsForRound,
    );
    return e?.payoffs[personaId];
  }

  const replayRoundNumber = currentRoundId ?? visibleCompletedRoundIds.size;

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={{ background: "var(--gt-bg)" }}>
      <ReplayIntro
        gameTypeName={formatGameTypeName(gameType)}
        participants={participants}
        onStart={startPlayback}
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header
        className="shrink-0 border-b"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        <div className="mx-auto flex items-center justify-between h-[60px] px-8" style={{ maxWidth: "1200px" }}>
        <div className="flex items-center gap-2">
          <span
            className="text-[13px]"
            style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
          >
            Game Theory Lab
          </span>
          <span className="text-[13px]" style={{ color: "var(--gt-t4)" }}>/</span>
          <span
            className="text-[15px] font-[600]"
            style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
          >
            {formatGameTypeName(gameType)}
          </span>
          {replayRoundNumber > 0 && (
            <>
              <span className="text-[13px]" style={{ color: "var(--gt-t4)" }}>/</span>
              <span
                className="inline-flex items-center px-2.5 py-0.5 text-[12px] border"
                style={{
                  borderRadius: "9999px",
                  color: "var(--gt-t2)",
                  borderColor: "var(--gt-border-md)",
                  fontFamily: "IBMPlexMono, monospace",
                }}
              >
                R{replayRoundNumber}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                void navigator.clipboard.writeText(
                  `${window.location.origin}/game/${token}/replay`,
                );
              }
            }}
            className="text-[13px] transition-colors hover:underline"
            style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
          >
            Copy Link
          </button>

          <div
            className="flex items-center gap-2 px-2.5 py-1 border"
            style={{
              borderRadius: "9999px",
              borderColor: isComplete ? "var(--gt-border-md)" : "var(--gt-blue-border)",
              background: isComplete ? "transparent" : "var(--gt-blue-bg)",
            }}
          >
            <span
              className="text-[12px] font-[500]"
              style={{
                color: isComplete ? "var(--gt-t3)" : "var(--gt-blue)",
                fontFamily: "IBMPlexMono, monospace",
                letterSpacing: "0.06em",
              }}
            >
              {isComplete ? "Complete" : isIntroComplete ? "Replay" : "Ready"}
            </span>
          </div>
        </div>
        </div>
      </header>

      {/* ── Result banner ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isComplete && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="shrink-0 h-8 flex items-center justify-center gap-4 border-b"
            style={{ borderColor: "var(--gt-border)", background: `${winnerColor}0d` }}
          >
            <div className="flex-1 h-px max-w-16" style={{ backgroundColor: `${winnerColor}30` }} />
            <span
              className="text-[12px] font-[600]"
              style={{ color: winnerColor, letterSpacing: "var(--gt-tracking-tight)" }}
            >
              {winner === "TIE" ? "Tie · Equal Scores" : `${winner} wins`}
            </span>
            <div className="flex-1 h-px max-w-16" style={{ backgroundColor: `${winnerColor}30` }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Player arena ───────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex items-center justify-center py-8 px-8">
      <div
        className="w-full grid gap-6"
        style={{
          maxWidth: "1200px",
          gridTemplateColumns: `repeat(${Math.max(participants.length, 1)}, 1fr)`,
        }}
      >
        {participants.map((participant, idx) => {
          const resultState = getResultState(participant.personaId);
          const cumScore = displayScores[participant.personaId] ?? 0;
          const isDeliberating = playersDeliberating.has(participant.personaId);
          const isRevealed = playersRevealed.has(participant.personaId);

          return (
            <PlayerCard2
              key={participant.personaId}
              personaId={participant.personaId}
              personaName={participant.name}
              playerIndex={idx}
              decision={isRevealed ? getDecisionForReplay(participant.personaId) : null}
              lastDiscussion={null}
              payoff={isRevealed ? getPayoffForReplay(participant.personaId) : undefined}
              cumulativeScore={cumScore}
              isCurrentRound={isDeliberating || isRevealed}
              resultState={resultState}
              onClick={() => {}}
            />
          );
        })}
      </div>
      </div>

      {/* ── Control bar ────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-t"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
      <div className="mx-auto flex items-center gap-4 h-12 px-8" style={{ maxWidth: "1200px" }}>
        {/* Progress track */}
        <div className="flex-1 relative h-[3px] rounded-full" style={{ background: "var(--gt-border)" }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-none"
            style={{ width: `${progress}%`, backgroundColor: "var(--gt-blue)" }}
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

        <span
          className="tabular-nums w-8 text-right text-[12px]"
          style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
        >
          {Math.round(progress)}%
        </span>

        {!isComplete && (
          <button
            onClick={skipToEnd}
            className="text-[12px] transition-colors hover:underline"
            style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
          >
            Skip →
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
