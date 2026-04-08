"use client";

import { fetchGameSession, GameSessionDetail } from "@/app/(game-theory)/actions";
import { GameSessionParticipant, HUMAN_PLAYER_ID } from "@/app/(game-theory)/types";
import { AnimatePresence } from "motion/react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import useSWR from "swr";
import { GameLayout } from "./GameLayout";
import { HumanInputPanel, PendingHumanTurn } from "./HumanInputPanel";
import { PLAYER_COLORS, PlayerResultState } from "./PlayerCard";
import { RoundDetailView } from "./RoundDetailView";
import { ResultsView } from "./ResultsView";
import {
  deriveGameState,
  getScoresUpToRound,
  RoundData,
} from "./index";

// ── Round selection reducer ─────────────────────────────────────────────────

type RoundNavState = {
  manualRoundId: number | null;
  revealHoldRound: number | null;
};

type RoundNavAction =
  | { type: "SELECT_ROUND"; roundId: number | null }
  | { type: "ROUND_COMPLETED"; completedRoundId: number }
  | { type: "REVEAL_HOLD_EXPIRED" }
  | { type: "CLEAR_REVEAL_HOLD" }
  | { type: "GAME_COMPLETED" };

function roundNavReducer(state: RoundNavState, action: RoundNavAction): RoundNavState {
  switch (action.type) {
    case "SELECT_ROUND":
      return { ...state, manualRoundId: action.roundId };
    case "ROUND_COMPLETED":
      if (state.manualRoundId !== null) return state;
      return { ...state, revealHoldRound: action.completedRoundId };
    case "REVEAL_HOLD_EXPIRED":
      return { ...state, revealHoldRound: null };
    case "CLEAR_REVEAL_HOLD":
      return { ...state, revealHoldRound: null };
    case "GAME_COMPLETED":
      return { manualRoundId: null, revealHoldRound: null };
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export function HumanGameView({ initialData, token }: { initialData: GameSessionDetail; token: string }) {
  const { data: authSession } = useSession();
  const currentUserId = authSession?.user?.id ?? null;

  // ── SWR with compare — no re-render when data is identical ──────────────
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

  // Pin participants (never changes mid-session)
  const participantsRef = useRef(session.extra?.participants ?? []);
  if (session.extra?.participants?.length) {
    participantsRef.current = session.extra.participants;
  }
  const participants: GameSessionParticipant[] = participantsRef.current;

  // ── Derived game state ──────────────────────────────────────────────────
  const isCompleted = status === "completed";
  const gameState = useMemo(() => deriveGameState(events, isCompleted), [events, isCompleted]);

  // ── Human turn detection ────────────────────────────────────────────────
  const humanParticipant = participants.find((p) => p.personaId === HUMAN_PLAYER_ID);
  const isCurrentUserHuman = humanParticipant?.userId != null && humanParticipant.userId === currentUserId;

  // Scoped submitted requests: Map<requestId, roundNumber>, clears on round completion
  const [submittedRequests, setSubmittedRequests] = useState<Map<string, number>>(new Map());

  // Clear stale entries when rounds complete
  const completedRoundsKey = gameState.completedRounds.join(",");
  useEffect(() => {
    setSubmittedRequests((prev) => {
      const completedSet = new Set(gameState.completedRounds);
      const next = new Map<string, number>();
      for (const [id, round] of prev) {
        if (!completedSet.has(round)) next.set(id, round);
      }
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedRoundsKey]);

  const pendingHumanTurn = useMemo((): PendingHumanTurn | null => {
    if (!isCurrentUserHuman) return null;
    const now = Date.now();
    // Scan from end — pending events are recent (near the tail)
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (
        (e.type === "human-discussion-pending" || e.type === "human-decision-pending") &&
        e.expiresAt > now &&
        !submittedRequests.has(e.requestId)
      ) {
        const alreadySubmitted = events.some(
          (s) =>
            (s.type === "human-discussion-submitted" || s.type === "human-decision-submitted") &&
            s.requestId === e.requestId,
        );
        if (!alreadySubmitted) return e;
      }
    }
    return null;
  }, [events, isCurrentUserHuman, submittedRequests]);

  // ── Round selection (reducer-based state machine) ───────────────────────
  const [roundNav, dispatchRoundNav] = useReducer(roundNavReducer, {
    manualRoundId: null,
    revealHoldRound: null,
  });

  // Detect new round completions via count change
  const prevCompletedCountRef = useRef(gameState.completedRounds.length);
  useEffect(() => {
    const prevCount = prevCompletedCountRef.current;
    const newCount = gameState.completedRounds.length;
    prevCompletedCountRef.current = newCount;

    if (newCount > prevCount && gameState.activeRound) {
      const lastCompleted = gameState.completedRounds.at(-1)!;
      dispatchRoundNav({ type: "ROUND_COMPLETED", completedRoundId: lastCompleted });
      const timer = setTimeout(() => dispatchRoundNav({ type: "REVEAL_HOLD_EXPIRED" }), 2500);
      return () => clearTimeout(timer);
    }
    if (!gameState.activeRound && isCompleted) {
      dispatchRoundNav({ type: "GAME_COMPLETED" });
    }
  }, [gameState.completedRounds.length, gameState.activeRound, isCompleted]);

  // When human has a pending turn, clear reveal hold immediately
  useEffect(() => {
    if (pendingHumanTurn) {
      dispatchRoundNav({ type: "CLEAR_REVEAL_HOLD" });
    }
  }, [pendingHumanTurn]);

  const autoRoundId = gameState.activeRound ?? gameState.completedRounds.at(-1) ?? null;
  const hasActiveSubmission = gameState.activeRound !== null &&
    [...submittedRequests.values()].some((r) => r === gameState.activeRound);
  const skipRevealHold = isCurrentUserHuman && (!!pendingHumanTurn || hasActiveSubmission);
  const selectedRoundId = roundNav.manualRoundId ?? (skipRevealHold ? null : roundNav.revealHoldRound) ?? autoRoundId;

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

  const bannerData = useMemo(() => {
    if (!isCompleted) return null;
    if (isFullTie) return { text: "Tie · Equal Scores", color: "var(--gt-warn)" };
    if (winners.length === 1) {
      const idx = participants.indexOf(winners[0]);
      return { text: `${winners[0].name} wins`, color: PLAYER_COLORS[idx] ?? "var(--gt-pos)" };
    }
    return { text: `${winners.map((w) => w.name).join(" & ")} win`, color: "var(--gt-pos)" };
  }, [isCompleted, isFullTie, winners, participants]);

  const showResults = isCompleted && roundNav.manualRoundId === null;

  // ── Round nav data ────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────

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
      manualRoundId={roundNav.manualRoundId}
      showResults={showResults}
      canGoPrev={canGoPrev}
      canGoNext={canGoNext}
      effectiveIdx={effectiveIdx}
      onSelectRound={(roundId) => dispatchRoundNav({ type: "SELECT_ROUND", roundId })}
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
          isHumanPlayer={isCurrentUserHuman}
          pendingHumanTurn={pendingHumanTurn}
          playersDeliberating={playersDeliberating}
          discussedPlayers={isLiveRound ? gameState.discussedPlayers : new Set<number>()}
          getResultState={getResultState}
        />
      )}

      {/* ── Human input panel ────────────────────────────────────────────── */}
      <AnimatePresence>
        {pendingHumanTurn && !showResults && !isPending && (
          <HumanInputPanel
            key={pendingHumanTurn.requestId}
            pendingTurn={pendingHumanTurn}
            token={token}
            gameTypeName={gameType}
            participants={participants}
            currentScores={gameState.scores}
            onSubmitted={() => {
              setSubmittedRequests((prev) =>
                new Map(prev).set(pendingHumanTurn.requestId, pendingHumanTurn.round),
              );
            }}
          />
        )}
      </AnimatePresence>
    </GameLayout>
  );
}
