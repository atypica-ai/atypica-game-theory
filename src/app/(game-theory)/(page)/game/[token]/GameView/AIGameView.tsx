"use client";

import { fetchGameSession, GameSessionDetail } from "@/app/(game-theory)/actions";
import { GameSessionParticipant } from "@/app/(game-theory)/types";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { GameLayout } from "./GameLayout";
import { PLAYER_COLORS, PlayerResultState } from "./PlayerCard";
import { ResultsView } from "./ResultsView";
import { RoundDetailView } from "./RoundDetailView";
import {
  deriveGameState,
  getScoresUpToRound,
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
    <GameLayout
      token={token}
      gameType={gameType}
      isCompleted={isCompleted}
      isPending={isPending}
      currentRoundNumber={currentRoundNumber}
      bannerData={bannerData}
      navRounds={navRounds}
      rounds={gameState.rounds}
      selectedRoundId={selectedRoundId}
      manualRoundId={manualRoundId}
      showResults={showResults}
      canGoPrev={canGoPrev}
      canGoNext={canGoNext}
      effectiveIdx={effectiveIdx}
      onSelectRound={(roundId) => setManualRoundId(roundId)}
    >
      {isPending ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--gt-border-md)" }} />
            ))}
          </div>
          <span className="text-[12px] uppercase" style={{ color: "var(--gt-t4)", fontFamily: "IBMPlexMono, monospace", letterSpacing: "0.12em" }}>
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
    </GameLayout>
  );
}
