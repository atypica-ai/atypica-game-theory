"use client";

import { GameSessionDetail } from "@/app/(game-theory)/actions";
import {
  runAIDiscussionFor,
  startHumanRound,
  settleHumanRound,
  completeHumanGame,
} from "@/app/(game-theory)/humanActions";
import { GameSessionParticipant, HUMAN_PLAYER_ID, PersonaDecisionEvent, PersonaDiscussionEvent } from "@/app/(game-theory)/types";
import { AnimatePresence } from "motion/react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { GameLayout } from "./GameLayout";
import { HumanInputPanel } from "./HumanInputPanel";
import { PLAYER_COLORS, PlayerResultState } from "./PlayerCard";
import { RoundDetailView } from "./RoundDetailView";
import { ResultsView } from "./ResultsView";
import {
  deriveGameState,
  getScoresUpToRound,
  RoundData,
} from "./index";
import type { GameTimeline, GameTimelineEvent } from "@/app/(game-theory)/types";

// ── Game step types ────────────────────────────────────────────────────────

type GameStep =
  | { phase: "roundStart"; roundId: number }
  | { phase: "aiDiscussion"; roundId: number }
  | { phase: "humanDiscussion"; roundId: number }
  | { phase: "decision"; roundId: number }       // human + AI in parallel
  | { phase: "settling"; roundId: number }
  | { phase: "reveal"; roundId: number }
  | { phase: "completed" };

// ── Derive initial step from timeline (for resume) ─────────────────────────

function deriveInitialStep(
  events: GameTimelineEvent[],
  participants: GameSessionParticipant[],
  status: string,
  discussionRounds: number,
): GameStep {
  if (status === "completed") return { phase: "completed" };

  // Find latest round
  let latestRound = 0;
  for (const e of events) {
    if ("round" in e && typeof e.round === "number" && e.round > latestRound) {
      latestRound = e.round;
    }
  }

  // No rounds yet — start round 1
  if (latestRound === 0) return { phase: "roundStart", roundId: 1 };

  const roundId = latestRound;

  // Check if round has results
  const hasResult = events.some(
    (e) => e.type === "round-result" && e.round === roundId,
  );
  if (hasResult) {
    // Round complete — check if game should continue (start next round)
    // We'll let the reveal phase handle the transition
    return { phase: "reveal", roundId };
  }

  // Check decisions
  const decisions = events.filter(
    (e): e is PersonaDecisionEvent => e.type === "persona-decision" && e.round === roundId,
  );
  if (decisions.length === participants.length) {
    return { phase: "settling", roundId };
  }
  if (decisions.length > 0) {
    // Some decisions exist — we're in decision phase
    return { phase: "decision", roundId };
  }

  // Check discussions
  const discussions = events.filter(
    (e): e is PersonaDiscussionEvent => e.type === "persona-discussion" && e.round === roundId,
  );
  const aiParticipants = participants.filter((p) => p.personaId !== HUMAN_PLAYER_ID);
  const spokenAI = discussions.filter((d) => d.personaId !== HUMAN_PLAYER_ID);
  const humanSpoken = discussions.some((d) => d.personaId === HUMAN_PLAYER_ID);

  if (discussionRounds > 0) {
    if (spokenAI.length < aiParticipants.length) {
      return { phase: "aiDiscussion", roundId };
    }
    if (!humanSpoken) {
      return { phase: "humanDiscussion", roundId };
    }
  }

  // Discussion complete (or none) — start decisions
  return { phase: "decision", roundId };
}

// ── Round navigation reducer ───────────────────────────────────────────────

type RoundNavState = {
  manualRoundId: number | null;
  revealHoldRound: number | null;
};

type RoundNavAction =
  | { type: "SELECT_ROUND"; roundId: number | null }
  | { type: "ROUND_COMPLETED"; completedRoundId: number }
  | { type: "REVEAL_HOLD_EXPIRED" }
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
    case "GAME_COMPLETED":
      return { manualRoundId: null, revealHoldRound: null };
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function HumanGameView({ initialData, token }: { initialData: GameSessionDetail; token: string }) {
  const { data: authSession } = useSession();
  const currentUserId = authSession?.user?.id ?? null;

  // ── Core state ─────────────────────────────────────────────────────────
  const participants: GameSessionParticipant[] = useMemo(
    () => initialData.extra?.participants ?? [],
    [initialData.extra?.participants],
  );
  const humanParticipant = participants.find((p) => p.personaId === HUMAN_PLAYER_ID);
  const isCurrentUserHuman = humanParticipant?.userId != null && humanParticipant.userId === currentUserId;
  const gameTypeName = initialData.gameType;
  const discussionRounds = initialData.extra?.discussionRounds ?? 0;

  // Local events — the frontend appends as each server action returns (no polling)
  const [events, setEvents] = useState<GameTimeline>(initialData.events);
  const eventsRef = useRef(events);
  // Sync ref on render (covers external state updates like initial load)
  eventsRef.current = events;
  const [status, setStatus] = useState(initialData.status);

  // Derive game state from local events
  const isCompleted = status === "completed";
  const gameState = useMemo(() => deriveGameState(events, isCompleted), [events, isCompleted]);

  // Game step state machine + human turn — derived together on mount for correct resume
  const [initialStep] = useState(() =>
    deriveInitialStep(events, participants, status, discussionRounds),
  );
  const [step, setStep] = useState<GameStep>(initialStep);

  // Human turn state — initialized from step for resume scenarios
  const [humanTurn, setHumanTurn] = useState<{ type: "discussion" | "decision"; roundId: number } | null>(() => {
    if (initialStep.phase === "humanDiscussion") return { type: "discussion", roundId: initialStep.roundId };
    if (initialStep.phase === "decision") return { type: "decision", roundId: initialStep.roundId };
    return null;
  });

  // Tracks whether AI decisions have completed (set by effect, read by human callback)
  const aiDoneRef = useRef(false);

  // Tracks which AI persona is currently generating a discussion turn
  const [currentSpeakerId, setCurrentSpeakerId] = useState<number | null>(null);

  // Error state for displaying failures
  const [error, setError] = useState<string | null>(null);

  // ── Round navigation ───────────────────────────────────────────────────
  const [roundNav, dispatchRoundNav] = useReducer(roundNavReducer, {
    manualRoundId: null,
    revealHoldRound: null,
  });

  const autoRoundId = gameState.activeRound ?? gameState.completedRounds.at(-1) ?? null;
  const selectedRoundId = roundNav.manualRoundId ?? roundNav.revealHoldRound ?? autoRoundId;

  const selectedRoundData = useMemo((): RoundData | null => {
    if (selectedRoundId === null) return null;
    const found = gameState.rounds.find((r) => r.roundId === selectedRoundId);
    if (found) return found;
    if (selectedRoundId <= gameState.latestRound) {
      return { roundId: selectedRoundId, discussions: [], decisions: [], result: null };
    }
    return null;
  }, [selectedRoundId, gameState.rounds, gameState.latestRound]);

  const isLiveRound = selectedRoundId !== null && step.phase !== "completed" &&
    "roundId" in step && selectedRoundId === step.roundId;

  // ── Step machine effects ──────────────────────────────────────────────

  // Helper: append events to local state.
  // Updates eventsRef immediately so async loops read fresh state
  // without waiting for a React re-render.
  const appendEvents = useCallback((...newEvents: GameTimelineEvent[]) => {
    const next = [...eventsRef.current, ...newEvents];
    eventsRef.current = next;
    setEvents(next);
  }, []);

  useEffect(() => {
    if (step.phase === "completed" || step.phase === "humanDiscussion") return;

    let cancelled = false;

    (async () => {
      try {
        switch (step.phase) {
          case "roundStart": {
            const res = await startHumanRound(token, step.roundId);
            if (cancelled) break;
            if (!res.success) { setError(res.message); break; }
            appendEvents({ type: "system", content: `Round ${step.roundId} begins.`, round: step.roundId });
            setStep(discussionRounds > 0
              ? { phase: "aiDiscussion", roundId: step.roundId }
              : { phase: "decision", roundId: step.roundId });
            break;
          }

          case "aiDiscussion": {
            // Pick one random unspeaking AI at a time using fresh state.
            // On resume, already-spoken AI are skipped via eventsRef.
            while (!cancelled) {
              const currentEvents = eventsRef.current;
              const spokenIds = new Set(
                currentEvents
                  .filter((e): e is PersonaDiscussionEvent => e.type === "persona-discussion" && e.round === step.roundId)
                  .map((e) => e.personaId),
              );
              const remaining = participants.filter(
                (p) => p.personaId !== HUMAN_PLAYER_ID && !spokenIds.has(p.personaId),
              );
              if (remaining.length === 0) break;

              // Pick a random next speaker
              const next = remaining[Math.floor(Math.random() * remaining.length)];
              setCurrentSpeakerId(next.personaId);

              const res = await runAIDiscussionFor(token, next.personaId, step.roundId);
              if (cancelled) break;
              if (!res.success) { setError(res.message); break; }
              appendEvents(res.event);
            }
            if (!cancelled) {
              setCurrentSpeakerId(null);
              setHumanTurn({ type: "discussion", roundId: step.roundId });
              setStep({ phase: "humanDiscussion", roundId: step.roundId });
            }
            break;
          }

          case "decision": {
            aiDoneRef.current = false;
            humanDoneRef.current = false;
            setHumanTurn({ type: "decision", roundId: step.roundId });
            // Fire individual fetch() calls — truly parallel, each appends immediately
            // (RoundDetailView masks content until human submits)
            const aiParticipants = participants.filter((p) => p.personaId !== HUMAN_PLAYER_ID);
            let completedCount = 0;
            await Promise.all(
              aiParticipants.map(async (p) => {
                try {
                  const res = await fetch("/api/internal/game-ai-decision", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, personaId: p.personaId, roundId: step.roundId }),
                  });
                  const data = await res.json();
                  if (!cancelled && data.success) {
                    appendEvents(data.event);
                  }
                } finally {
                  completedCount++;
                  if (completedCount === aiParticipants.length) {
                    aiDoneRef.current = true;
                  }
                }
              }),
            );
            break;
          }

          case "settling": {
            const res = await settleHumanRound(token, step.roundId);
            if (cancelled) break;
            if (!res.success) { setError(res.message); break; }
            appendEvents(
              { type: "round-result", round: step.roundId, payoffs: res.payoffs },
              { type: "system", content: `Round ${step.roundId} results.`, round: step.roundId },
            );
            if (res.isTerminated) {
              await completeHumanGame(token);
              setStatus("completed");
              setStep({ phase: "completed" });
            } else {
              dispatchRoundNav({ type: "ROUND_COMPLETED", completedRoundId: step.roundId });
              setStep({ phase: "reveal", roundId: step.roundId });
            }
            break;
          }

          case "reveal": {
            await new Promise((r) => setTimeout(r, 2500));
            if (!cancelled) {
              dispatchRoundNav({ type: "REVEAL_HOLD_EXPIRED" });
              setStep({ phase: "roundStart", roundId: step.roundId + 1 });
            }
            break;
          }
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Human submission callbacks ─────────────────────────────────────────

  const onHumanDiscussionSubmitted = useCallback(
    (event: PersonaDiscussionEvent) => {
      appendEvents(event);
      setHumanTurn(null);
      // All discussions done → move to decision phase
      setStep({ phase: "decision", roundId: event.round });
    },
    [appendEvents],
  );

  const humanDoneRef = useRef(false);

  const onHumanDecisionSubmitted = useCallback(
    (event: PersonaDecisionEvent) => {
      appendEvents(event);
      setHumanTurn(null);
      humanDoneRef.current = true;
      if (aiDoneRef.current) {
        setStep({ phase: "settling", roundId: event.round });
      }
    },
    [appendEvents],
  );

  // When AI decisions complete AND human already submitted → settle
  useEffect(() => {
    if (step.phase !== "decision" || !("roundId" in step)) return;
    if (aiDoneRef.current && humanDoneRef.current) {
      setStep({ phase: "settling", roundId: step.roundId });
    }
  }, [events, step]);

  // ── Completion data ────────────────────────────────────────────────────

  const isPending = status === "pending" || participants.length === 0;

  const playersDeliberating = useMemo(() => {
    if (step.phase !== "decision" || !("roundId" in step)) return new Set<number>();
    return new Set(
      participants.filter((p) => !gameState.decidedPlayers.has(p.personaId)).map((p) => p.personaId),
    );
  }, [step, gameState.decidedPlayers, participants]);

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

  // ── Phase for display ──────────────────────────────────────────────────
  const displayPhase = (() => {
    if (!isLiveRound) return selectedRoundData?.result ? "reveal" as const : "starting" as const;
    switch (step.phase) {
      case "aiDiscussion":
      case "humanDiscussion":
        return "discussion" as const;
      case "decision":
        return "decision" as const;
      case "settling":
      case "reveal":
        return "reveal" as const;
      default:
        return "starting" as const;
    }
  })();

  // ── Round nav data ─────────────────────────────────────────────────────
  const navRounds = [
    ...gameState.completedRounds.map((r) => ({ roundId: r, isLive: false })),
    ...(gameState.activeRound !== null ? [{ roundId: gameState.activeRound, isLive: true }] : []),
  ];

  const currentRoundNumber = "roundId" in step ? step.roundId : (gameState.completedRounds.at(-1) ?? 0);

  const effectiveIdx = showResults
    ? navRounds.length
    : navRounds.findIndex((r) => r.roundId === selectedRoundId);
  const maxIdx = isCompleted ? navRounds.length : navRounds.length - 1;
  const canGoPrev = effectiveIdx > 0;
  const canGoNext = effectiveIdx < maxIdx;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <GameLayout
      token={token}
      gameType={gameTypeName}
      isCompleted={isCompleted}
      isPending={isPending}
      currentRoundNumber={currentRoundNumber}
      bannerData={bannerData}
      navRounds={navRounds}
      rounds={gameState.rounds}
      manualRoundId={roundNav.manualRoundId}
      showResults={showResults}
      canGoPrev={canGoPrev}
      canGoNext={canGoNext}
      effectiveIdx={effectiveIdx}
      onSelectRound={(roundId) => dispatchRoundNav({ type: "SELECT_ROUND", roundId })}
    >
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8">
          <span className="text-[13px] font-[500]" style={{ color: "var(--gt-neg)" }}>Error</span>
          <span className="text-[12px] text-center" style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace", maxWidth: "400px" }}>{error}</span>
          <button
            onClick={() => { setError(null); setStep((s) => ({ ...s })); }}
            className="mt-2 px-4 py-1.5 text-[12px]"
            style={{ color: "var(--gt-blue)", fontFamily: "IBMPlexMono, monospace" }}
          >
            Retry
          </button>
        </div>
      ) : isPending ? (
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
          gameType={gameTypeName}
        />
      ) : (
        <RoundDetailView
          roundData={selectedRoundData}
          participants={participants}
          scoresForRound={selectedRoundId !== null ? getScoresUpToRound(gameState.rounds, selectedRoundId) : gameState.scores}
          isLive={isLiveRound}
          phase={displayPhase}
          discussionCount={isLiveRound ? gameState.discussionCount : (selectedRoundData?.discussions.length ?? 0)}
          totalPlayers={participants.length}
          isHumanPlayer={isCurrentUserHuman}
          pendingHumanTurn={humanTurn ? {
            type: humanTurn.type === "discussion" ? "human-discussion-pending" : "human-decision-pending",
            round: humanTurn.roundId,
          } : null}
          maskDecisions={humanTurn?.type === "decision"}
          playersDeliberating={playersDeliberating}
          discussedPlayers={isLiveRound ? gameState.discussedPlayers : new Set<number>()}
          currentSpeakerId={isLiveRound ? currentSpeakerId : null}
          getResultState={getResultState}
        />
      )}

      {/* ── Human input panel ────────────────────────────────────────────── */}
      <AnimatePresence>
        {humanTurn && !showResults && !isPending && (
          <HumanInputPanel
            key={`${humanTurn.type}-${humanTurn.roundId}`}
            humanTurn={humanTurn}
            token={token}
            gameTypeName={gameTypeName}
            currentScores={gameState.scores}
            onDiscussionSubmitted={onHumanDiscussionSubmitted}
            onDecisionSubmitted={onHumanDecisionSubmitted}
          />
        )}
      </AnimatePresence>
    </GameLayout>
  );
}
