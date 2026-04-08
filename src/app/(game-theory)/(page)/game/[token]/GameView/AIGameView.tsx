"use client";

import { fetchGameSession, GameSessionDetail } from "@/app/(game-theory)/actions";
import { GameSessionParticipant } from "@/app/(game-theory)/types";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { PLAYER_COLORS, PlayerResultState } from "./PlayerCard";
import { ResultsView } from "./ResultsView";
import { RoundDetailView } from "./RoundDetailView";
import { RoundPill } from "./RoundView";
import {
  deriveGameState,
  formatGameTypeName,
  getScoresUpToRound,
  getRoundPayoffSum,
  RoundData,
} from "./index";

// ── AI-only game view ───────────────────────────────────────────────────────

export function AIGameView({ initialData, token }: { initialData: GameSessionDetail; token: string }) {
  const { data } = useSWR(
    ["game:session", token],
    async () => {
      const result = await fetchGameSession(token);
      if (!result.success) throw new Error(result.message);
      return result.data;
    },
    {
      fallbackData: initialData,
      refreshInterval: (d) => (d?.status === "completed" ? 0 : 2000),
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      compare: (a, b) => {
        if (a === b) return true;
        if (!a || !b) return false;
        return a.status === b.status && a.events.length === b.events.length;
      },
    },
  );

  const session = data ?? initialData;
  const { status, gameType } = session;
  const events = session.events;

  const participantsRef = useRef(session.extra?.participants ?? []);
  if (session.extra?.participants?.length) {
    participantsRef.current = session.extra.participants;
  }
  const participants: GameSessionParticipant[] = participantsRef.current;

  // ── Unified game state ─────────────────────────────────────────────────────
  const isCompleted = status === "completed";
  const gameState = useMemo(() => deriveGameState(events, isCompleted), [events, isCompleted]);

  // ── Round selection ──────────────────────────────────────────────────────
  const [manualRoundId, setManualRoundId] = useState<number | null>(null);
  const [revealHoldRound, setRevealHoldRound] = useState<number | null>(null);

  // Track last seen completed round count to detect new completions
  const prevCompletedCountRef = useRef(gameState.completedRounds.length);
  useEffect(() => {
    const prevCount = prevCompletedCountRef.current;
    const newCount = gameState.completedRounds.length;
    prevCompletedCountRef.current = newCount;

    if (newCount > prevCount && gameState.activeRound) {
      const lastCompleted = gameState.completedRounds.at(-1)!;
      setRevealHoldRound(lastCompleted);
      const timer = setTimeout(() => setRevealHoldRound(null), 2500);
      return () => clearTimeout(timer);
    }
    if (!gameState.activeRound) {
      setRevealHoldRound(null);
    }
  }, [gameState.completedRounds.length, gameState.activeRound, gameState.completedRounds]);

  const autoRoundId = gameState.activeRound ?? gameState.completedRounds.at(-1) ?? null;
  const selectedRoundId = manualRoundId ?? revealHoldRound ?? autoRoundId;

  const selectedRoundData = useMemo((): RoundData | null => {
    if (selectedRoundId === null) return null;
    const found = gameState.rounds.find((r) => r.roundId === selectedRoundId);
    if (found) return found;
    if (selectedRoundId <= gameState.latestRound) {
      return { roundId: selectedRoundId, discussions: [], decisions: [], result: null };
    }
    return null;
  }, [selectedRoundId, gameState.rounds, gameState.latestRound]);

  const isLiveRound = selectedRoundId === gameState.activeRound && gameState.activeRound !== null;

  // ── Completion ────────────────────────────────────────────────────────────
  const isPending = status === "pending" || participants.length === 0;

  const playersDeliberating = useMemo(() => {
    if (!gameState.activeRound) return new Set<number>();
    return new Set(
      participants.filter((p) => !gameState.decidedPlayers.has(p.personaId)).map((p) => p.personaId),
    );
  }, [gameState.activeRound, gameState.decidedPlayers, participants]);

  const winners = useMemo(() => {
    if (!isCompleted || participants.length === 0) return [] as GameSessionParticipant[];
    const maxScore = Math.max(...participants.map((p) => gameState.scores[p.personaId] ?? 0));
    const leaders = participants.filter((p) => (gameState.scores[p.personaId] ?? 0) === maxScore);
    if (leaders.length === participants.length) return [] as GameSessionParticipant[];
    return leaders;
  }, [isCompleted, participants, gameState.scores]);

  const isFullTie = isCompleted && participants.length > 0 && winners.length === 0;

  function getResultState(personaId: number): PlayerResultState | undefined {
    if (!isCompleted) return undefined;
    if (isFullTie) return "tie";
    return winners.some((w) => w.personaId === personaId) ? "winner" : "loser";
  }

  // ── Result banner ─────────────────────────────────────────────────────────
  const bannerData = useMemo(() => {
    if (!isCompleted) return null;
    if (isFullTie) return { text: "Tie · Equal Scores", color: "var(--gt-warn)" };
    if (winners.length === 1) {
      const idx = participants.indexOf(winners[0]);
      return { text: `${winners[0].name} wins`, color: PLAYER_COLORS[idx] ?? "var(--gt-pos)" };
    }
    return { text: `${winners.map((w) => w.name).join(" & ")} win`, color: "var(--gt-pos)" };
  }, [isCompleted, isFullTie, winners, participants]);

  const showResults = isCompleted && manualRoundId === null;

  // ── Round nav ─────────────────────────────────────────────────────────────
  const navRounds = [
    ...gameState.completedRounds.map((r) => ({ roundId: r, isLive: false })),
    ...(gameState.activeRound !== null ? [{ roundId: gameState.activeRound, isLive: true }] : []),
  ];

  const currentRoundNumber =
    gameState.activeRound ??
    (gameState.completedRounds.length > 0 ? gameState.completedRounds[gameState.completedRounds.length - 1] : 0);

  const effectiveIdx = showResults
    ? navRounds.length
    : navRounds.findIndex((r) => r.roundId === selectedRoundId);
  const maxIdx = isCompleted ? navRounds.length : navRounds.length - 1;
  const canGoPrev = effectiveIdx > 0;
  const canGoNext = effectiveIdx < maxIdx;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--gt-bg)" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header
        className="shrink-0 border-b z-10"
        style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
      >
        <div
          className="mx-auto flex items-center justify-between h-[60px] px-8"
          style={{ maxWidth: "1200px" }}
        >
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-[13px] transition-colors hover:underline"
              style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}
            >
              Game Theory Lab
            </Link>
            <span className="text-[13px]" style={{ color: "var(--gt-t4)" }}>/</span>
            <span
              className="text-[15px] font-[600]"
              style={{ color: "var(--gt-t1)", letterSpacing: "var(--gt-tracking-tight)" }}
            >
              {formatGameTypeName(gameType)}
            </span>
            {!isPending && currentRoundNumber > 0 && (
              <>
                <span className="text-[13px]" style={{ color: "var(--gt-t4)" }}>/</span>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 text-[12px] font-[500] border"
                  style={{
                    borderRadius: "9999px",
                    color: "var(--gt-t2)",
                    borderColor: "var(--gt-border-md)",
                    fontFamily: "IBMPlexMono, monospace",
                  }}
                >
                  R{currentRoundNumber}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isCompleted && (
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
                Share Replay
              </button>
            )}

            <div
              className="flex items-center gap-2 px-2.5 py-1 border"
              style={{
                borderRadius: "9999px",
                borderColor: isCompleted ? "var(--gt-border-md)" : "var(--gt-blue-border)",
                background: isCompleted ? "transparent" : "var(--gt-blue-bg)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: isCompleted
                    ? "var(--gt-t4)"
                    : isPending
                      ? "var(--gt-t4)"
                      : "var(--gt-blue)",
                  animation: !isCompleted && !isPending ? "pulse 2s infinite" : undefined,
                }}
              />
              <span
                className="text-[12px] font-[500]"
                style={{
                  color: isCompleted
                    ? "var(--gt-t3)"
                    : isPending
                      ? "var(--gt-t3)"
                      : "var(--gt-blue)",
                  fontFamily: "IBMPlexMono, monospace",
                  letterSpacing: "0.06em",
                }}
              >
                {isCompleted ? "Complete" : isPending ? "Pending" : "Live"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Result banner ───────────────────────────────────────────────────── */}
      {bannerData && (
        <div
          className="shrink-0 h-8 flex items-center justify-center gap-4 border-b"
          style={{ borderColor: "var(--gt-border)", background: `${bannerData.color}0d` }}
        >
          <div className="flex-1 h-px max-w-16" style={{ backgroundColor: `${bannerData.color}30` }} />
          <span
            className="text-[12px] font-[600]"
            style={{ color: bannerData.color, letterSpacing: "var(--gt-tracking-tight)" }}
          >
            {bannerData.text}
          </span>
          <div className="flex-1 h-px max-w-16" style={{ backgroundColor: `${bannerData.color}30` }} />
        </div>
      )}

      {/* ── Round navigation bar ─────────────────────────────────────────────── */}
      {navRounds.length > 0 && (
        <div
          className="shrink-0 h-11 border-b flex items-stretch"
          style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
        >
          <button
            onClick={() => {
              if (!canGoPrev) return;
              if (showResults) {
                const last = gameState.completedRounds.at(-1);
                if (last !== undefined) setManualRoundId(last);
              } else {
                setManualRoundId(navRounds[effectiveIdx - 1].roundId);
              }
            }}
            disabled={!canGoPrev}
            className="shrink-0 px-4 h-full flex items-center text-[13px] transition-colors border-r"
            style={{
              color: canGoPrev ? "var(--gt-t2)" : "var(--gt-border-md)",
              borderColor: "var(--gt-border)",
              fontFamily: "IBMPlexMono, monospace",
              cursor: canGoPrev ? "pointer" : "default",
            }}
          >
            ←
          </button>

          <div className="flex-1 flex items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {gameState.activeRound !== null && (
              <button
                onClick={() => { setManualRoundId(null); }}
                className="flex items-center gap-1.5 px-5 h-full text-[13px] font-[500] border-b-2 shrink-0 transition-colors"
                style={{
                  borderBottomColor: manualRoundId === null && !isCompleted ? "var(--gt-blue)" : "transparent",
                  color: manualRoundId === null && !isCompleted ? "var(--gt-blue)" : "var(--gt-t3)",
                  fontFamily: "IBMPlexMono, monospace",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--gt-blue)" }} />
                Live
              </button>
            )}

            {navRounds.map(({ roundId, isLive }) => {
              const roundDataItem = gameState.rounds.find((r) => r.roundId === roundId);
              const payoffSum = !isLive && roundDataItem ? getRoundPayoffSum(roundDataItem) : null;
              return (
                <RoundPill
                  key={roundId}
                  roundId={roundId}
                  payoffSum={payoffSum}
                  isViewing={manualRoundId === roundId}
                  isLive={isLive}
                  onClick={() => {
                    if (isLive) setManualRoundId(null);
                    else setManualRoundId((prev) => (prev === roundId ? null : roundId));
                  }}
                />
              );
            })}

            {isCompleted && (
              <button
                onClick={() => setManualRoundId(null)}
                className="flex items-center gap-1.5 px-5 h-full text-[13px] font-[500] border-b-2 shrink-0 transition-colors"
                style={{
                  borderBottomColor: showResults ? "var(--gt-pos)" : "transparent",
                  color: showResults ? "var(--gt-pos)" : "var(--gt-t3)",
                  fontFamily: "IBMPlexMono, monospace",
                }}
              >
                Results
              </button>
            )}

            <div className="flex-1" />
          </div>

          <button
            onClick={() => {
              if (!canGoNext) return;
              if (effectiveIdx === navRounds.length - 1 && isCompleted) {
                setManualRoundId(null);
              } else {
                const next = navRounds[effectiveIdx + 1];
                if (next.isLive) setManualRoundId(null);
                else setManualRoundId(next.roundId);
              }
            }}
            disabled={!canGoNext}
            className="shrink-0 px-4 h-full flex items-center text-[13px] transition-colors border-l"
            style={{
              color: canGoNext ? "var(--gt-t2)" : "var(--gt-border-md)",
              borderColor: "var(--gt-border)",
              fontFamily: "IBMPlexMono, monospace",
              cursor: canGoNext ? "pointer" : "default",
            }}
          >
            →
          </button>
        </div>
      )}

      {/* ── Round content area ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {isPending ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--gt-border-md)" }}
                />
              ))}
            </div>
            <span
              className="text-[12px] uppercase"
              style={{
                color: "var(--gt-t4)",
                fontFamily: "IBMPlexMono, monospace",
                letterSpacing: "0.12em",
              }}
            >
              Awaiting players
            </span>
          </div>
        ) : showResults ? (
          <ResultsView
            events={events}
            participants={participants}
            cumulativeScores={gameState.scores}
            winners={winners}
            isFullTie={isFullTie}
            gameType={gameType}
          />
        ) : (
          <RoundDetailView
            roundData={selectedRoundData}
            participants={participants}
            scoresForRound={selectedRoundId !== null ? getScoresUpToRound(gameState.rounds, selectedRoundId) : gameState.scores}
            isLive={isLiveRound}
            phase={isLiveRound ? gameState.phase : (selectedRoundData?.result ? "reveal" : "starting")}
            discussionCount={isLiveRound ? gameState.discussionCount : (selectedRoundData?.discussions.length ?? 0)}
            totalPlayers={participants.length}
            isHumanPlayer={false}
            pendingHumanTurn={null}
            playersDeliberating={playersDeliberating}
            discussedPlayers={isLiveRound ? gameState.discussedPlayers : new Set<number>()}
            getResultState={getResultState}
          />
        )}
      </div>
    </div>
  );
}
