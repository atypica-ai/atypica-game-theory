"use client";

import { GameSessionDetail } from "@/app/(game-theory)/actions";
import { getGameType } from "@/app/(game-theory)/gameTypes";
import {
  runAIDiscussionFor,
  startHumanRound,
  settleHumanRound,
  completeHumanGame,
  submitHumanDiscussion,
  submitHumanDecision,
} from "@/app/(game-theory)/humanActions";
import {
  GameSessionParticipant,
  HUMAN_PLAYER_ID,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
} from "@/app/(game-theory)/types";
import type { GameTimeline, GameTimelineEvent } from "@/app/(game-theory)/types";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deriveGameState, RoundData } from "./index";
import { ResultsView } from "./ResultsView";
import { PhaseProgress, VisualPhase } from "./human/PhaseProgress";
import { RoundProgress } from "./human/RoundProgress";
import { DiscussionCard } from "./human/DiscussionCard";
import { CommitmentCard } from "./human/CommitmentCard";
import { AnalyzeCard } from "./human/AnalyzeCard";

const SILENT_DISCUSSION = "(said nothing)";

// ── Game step types ────────────────────────────────────────────────────────
//
// The step machine drives the game loop. Key change from the original:
//   "watching" is a new phase — human submitted their decision, now watching
//   AI decisions arrive one-by-one on the AnalyzeCard.
//
// AI decision fetches are decoupled from the step machine: they are fired
// as a standalone promise chain stored in a ref, so changing step does NOT
// cancel them. Each AI response calls appendEvents(), which triggers a
// React re-render and the AnalyzeCard shows the new decision live.

type GameStep =
  | { phase: "roundStart"; roundId: number }
  | { phase: "aiDiscussion"; roundId: number }
  | { phase: "humanDiscussion"; roundId: number }
  | { phase: "decision"; roundId: number }    // human sees CommitmentCard
  | { phase: "watching"; roundId: number }     // human submitted, AI still deciding
  | { phase: "settling"; roundId: number }     // payoff calculation in flight
  | { phase: "reveal"; roundId: number }       // results shown, PROCEED button
  | { phase: "completed" };

// ── Derive initial step from timeline (for resume / page refresh) ─────────

function deriveInitialStep(
  events: GameTimelineEvent[],
  participants: GameSessionParticipant[],
  status: string,
  discussionRounds: number,
): GameStep {
  if (status === "completed") return { phase: "completed" };

  let latestRound = 0;
  for (const e of events) {
    if ("round" in e && typeof e.round === "number" && e.round > latestRound) {
      latestRound = e.round;
    }
  }
  if (latestRound === 0) return { phase: "roundStart", roundId: 1 };

  const roundId = latestRound;
  const hasResult = events.some((e) => e.type === "round-result" && e.round === roundId);
  if (hasResult) return { phase: "reveal", roundId };

  const decisions = events.filter(
    (e): e is PersonaDecisionEvent => e.type === "persona-decision" && e.round === roundId,
  );
  const humanDecided = decisions.some((d) => d.personaId === HUMAN_PLAYER_ID);

  if (decisions.length === participants.length) return { phase: "settling", roundId };
  if (humanDecided) return { phase: "watching", roundId };
  if (decisions.length > 0) return { phase: "decision", roundId };

  const discussions = events.filter(
    (e): e is PersonaDiscussionEvent => e.type === "persona-discussion" && e.round === roundId,
  );
  const aiParticipants = participants.filter((p) => p.personaId !== HUMAN_PLAYER_ID);
  const spokenAI = discussions.filter((d) => d.personaId !== HUMAN_PLAYER_ID);
  const humanSpoken = discussions.some((d) => d.personaId === HUMAN_PLAYER_ID);

  if (discussionRounds > 0) {
    if (spokenAI.length < aiParticipants.length) return { phase: "aiDiscussion", roundId };
    if (!humanSpoken) return { phase: "humanDiscussion", roundId };
  }

  return { phase: "decision", roundId };
}

// ── Component ──────────────────────────────────────────────────────────────

export function HumanGameView({ initialData, token }: { initialData: GameSessionDetail; token: string }) {
  // ── Core derived data ─────────────────────────────────────────────────
  const participants: GameSessionParticipant[] = useMemo(
    () => initialData.extra?.participants ?? [],
    [initialData.extra?.participants],
  );
  const gameTypeName = initialData.gameType;
  const discussionRounds = initialData.extra?.discussionRounds ?? 0;
  const gameType = useMemo(() => getGameType(gameTypeName), [gameTypeName]);
  const totalRounds = gameType.horizon.type === "fixed" ? gameType.horizon.rounds : null;
  const humanParticipant = participants.find((p) => p.personaId === HUMAN_PLAYER_ID);
  const humanName = humanParticipant?.name ?? "You";

  // ── Event timeline (local, append-only) ───────────────────────────────
  const [events, setEvents] = useState<GameTimeline>(initialData.events);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const [status, setStatus] = useState(initialData.status);

  const isCompleted = status === "completed";
  const gameState = useMemo(() => deriveGameState(events, isCompleted), [events, isCompleted]);

  // ── State machine ─────────────────────────────────────────────────────
  const [step, setStep] = useState<GameStep>(() =>
    deriveInitialStep(events, participants, status, discussionRounds),
  );
  const stepRef = useRef(step);
  stepRef.current = step;

  const [humanTurn, setHumanTurn] = useState<{ type: "discussion" | "decision"; roundId: number } | null>(() => {
    const initial = deriveInitialStep(events, participants, status, discussionRounds);
    if (initial.phase === "humanDiscussion") return { type: "discussion", roundId: initial.roundId };
    if (initial.phase === "decision") return { type: "decision", roundId: initial.roundId };
    return null;
  });

  const [currentSpeakerId, setCurrentSpeakerId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appendEvents = useCallback((...newEvents: GameTimelineEvent[]) => {
    const next = [...eventsRef.current, ...newEvents];
    eventsRef.current = next;
    setEvents(next);
  }, []);

  // ── AI decision fetcher (decoupled from step machine) ─────────────────
  //
  // Fired once when entering "decision" phase. The promises continue running
  // even when step changes to "watching". Each AI response immediately
  // appends to events, causing live updates on the AnalyzeCard.
  // When all AI finish, we check if we can auto-settle.

  const aiDecisionRoundRef = useRef<number>(-1);

  const fireAIDecisions = useCallback((roundId: number) => {
    if (aiDecisionRoundRef.current === roundId) return; // already in flight
    aiDecisionRoundRef.current = roundId;

    const aiParticipants = participants.filter((p) => p.personaId !== HUMAN_PLAYER_ID);

    Promise.all(
      aiParticipants.map(async (p) => {
        try {
          const res = await fetch("/api/internal/game-ai-decision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, personaId: p.personaId, roundId }),
          });
          const data = await res.json();
          if (data.success) appendEvents(data.event);
        } catch {
          // Individual AI failure — others continue
        }
      }),
    ).then(() => {
      // All AI done. If human already submitted (watching/settling), trigger settle.
      const currentStep = stepRef.current;
      if (currentStep.phase === "watching" && "roundId" in currentStep && currentStep.roundId === roundId) {
        setStep({ phase: "settling", roundId });
      }
      // If still in "decision" phase, the handleDecisionSubmit will catch it
      // by checking all decisions are present.
    });
  }, [participants, token, appendEvents]);

  // ── Derived display state ─────────────────────────────────────────────

  const currentRound = "roundId" in step ? step.roundId : (gameState.completedRounds.at(-1) ?? 1);

  const visualPhase: VisualPhase = useMemo(() => {
    switch (step.phase) {
      case "roundStart": return discussionRounds > 0 ? "discussion" : "commitment";
      case "aiDiscussion":
      case "humanDiscussion": return "discussion";
      case "decision": return "commitment";
      case "watching":
      case "settling":
      case "reveal": return "analyze";
      case "completed": return "completed";
    }
  }, [step.phase, discussionRounds]);

  const currentRoundData = useMemo((): RoundData => {
    const found = gameState.rounds.find((r) => r.roundId === currentRound);
    return found ?? { roundId: currentRound, discussions: [], decisions: [], result: null };
  }, [gameState.rounds, currentRound]);

  const isFinalRound = totalRounds !== null && currentRound >= totalRounds;

  const isAllDecided = currentRoundData.decisions.length === participants.length;
  const hasResult = currentRoundData.result !== null;

  // ── Step machine effect ───────────────────────────────────────────────
  //
  // Handles: roundStart, aiDiscussion, decision (setup only), settling.
  // Does NOT handle: humanDiscussion (waits for user), watching (passive),
  // reveal (waits for user click), completed.

  useEffect(() => {
    const passive = ["completed", "humanDiscussion", "watching", "reveal"];
    if (passive.includes(step.phase)) return;

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
            // Setup: show CommitmentCard and fire AI decisions in background
            setHumanTurn({ type: "decision", roundId: step.roundId });
            fireAIDecisions(step.roundId);
            // Effect ends here — AI fetches run independently via fireAIDecisions.
            // Human submission handled by handleDecisionSubmit callback.
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
              setStep({ phase: "reveal", roundId: step.roundId });
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

  // ── Human callbacks ───────────────────────────────────────────────────

  const handleSendDiscussion = useCallback(
    (content: string) => {
      if (!humanTurn || humanTurn.type !== "discussion") return;
      const trimmed = content.trim() || SILENT_DISCUSSION;
      const event: PersonaDiscussionEvent = {
        type: "persona-discussion",
        personaId: HUMAN_PLAYER_ID,
        personaName: humanName,
        reasoning: null,
        content: trimmed,
        round: humanTurn.roundId,
      };
      appendEvents(event);
      setHumanTurn(null);
      setStep({ phase: "decision", roundId: humanTurn.roundId });
      void submitHumanDiscussion(token, content, humanTurn.roundId);
    },
    [token, humanTurn, humanName, appendEvents],
  );

  const handleSkipToDecision = useCallback(() => {
    if (humanTurn?.type === "discussion") {
      handleSendDiscussion("");
    } else if ("roundId" in step) {
      setCurrentSpeakerId(null);
      setHumanTurn(null);
      setStep({ phase: "decision", roundId: step.roundId });
    }
  }, [humanTurn, handleSendDiscussion, step]);

  const handleDecisionSubmit = useCallback(
    (action: Record<string, unknown>) => {
      if (!humanTurn || humanTurn.type !== "decision") return;
      const roundId = humanTurn.roundId;
      const event: PersonaDecisionEvent = {
        type: "persona-decision",
        personaId: HUMAN_PLAYER_ID,
        personaName: humanName,
        reasoning: null,
        content: action,
        round: roundId,
      };
      appendEvents(event);
      setHumanTurn(null);

      // Persist to DB, then transition. We go to "watching" immediately
      // so the user sees the AnalyzeCard with decisions streaming in.
      // The DB write must land before settling reads the timeline.
      void submitHumanDecision(token, action, roundId).then(() => {
        // Check if all AI already finished while we were writing
        const currentEvents = eventsRef.current;
        const allDecisions = currentEvents.filter(
          (e): e is PersonaDecisionEvent => e.type === "persona-decision" && e.round === roundId,
        );
        if (allDecisions.length === participants.length) {
          setStep({ phase: "settling", roundId });
        }
      });

      // Immediately show AnalyzeCard — don't wait for DB write
      setStep({ phase: "watching", roundId });
    },
    [token, humanTurn, humanName, appendEvents, participants.length],
  );

  const handleProceed = useCallback(() => {
    if (step.phase !== "reveal") return;
    setStep({ phase: "roundStart", roundId: step.roundId + 1 });
  }, [step]);

  const handleViewFinalResults = useCallback(() => {
    setStatus("completed");
    setStep({ phase: "completed" });
  }, []);

  // ── Completion data ───────────────────────────────────────────────────

  const winners = useMemo(() => {
    if (!isCompleted || participants.length === 0) return [] as GameSessionParticipant[];
    const maxScore = Math.max(...participants.map((p) => gameState.scores[p.personaId] ?? 0));
    const leaders = participants.filter((p) => (gameState.scores[p.personaId] ?? 0) === maxScore);
    if (leaders.length === participants.length) return [] as GameSessionParticipant[];
    return leaders;
  }, [isCompleted, participants, gameState.scores]);

  const isFullTie = isCompleted && participants.length > 0 && winners.length === 0;

  // ── Render ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--gt-bg)" }}>
        <div className="card-lab p-8 max-w-md text-center">
          <p className="text-[13px] font-medium mb-2" style={{ color: "var(--gt-neg)" }}>Error</p>
          <p className="text-[12px] mb-4" style={{ color: "var(--gt-t3)", fontFamily: "IBMPlexMono, monospace" }}>{error}</p>
          <button
            onClick={() => { setError(null); setStep((s) => ({ ...s })); }}
            className="btn-lab px-6"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--gt-bg)" }}>
      {visualPhase !== "completed" && (
        <PhaseProgress phase={visualPhase} hasDiscussion={discussionRounds > 0} />
      )}

      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {visualPhase === "discussion" && (
            <DiscussionCard
              key={`disc-${currentRound}`}
              discussions={currentRoundData.discussions}
              participants={participants}
              currentSpeakerId={currentSpeakerId}
              humanTurnActive={humanTurn?.type === "discussion"}
              onSendMessage={handleSendDiscussion}
              onSkipToDecision={handleSkipToDecision}
            />
          )}

          {visualPhase === "commitment" && (
            <CommitmentCard
              key={`commit-${currentRound}`}
              roundId={currentRound}
              gameTypeName={gameTypeName}
              participants={participants}
              aiReadySet={new Set<number>()}
              currentScores={gameState.scores}
              isSettling={false}
              onSubmit={handleDecisionSubmit}
            />
          )}

          {visualPhase === "analyze" && (
            <AnalyzeCard
              key={`analyze-${currentRound}`}
              roundId={currentRound}
              roundData={currentRoundData}
              participants={participants}
              isAllDecided={isAllDecided}
              isSettling={step.phase === "settling"}
              hasResult={hasResult}
              isFinalRound={isFinalRound}
              onProceed={isFinalRound ? handleViewFinalResults : handleProceed}
            />
          )}

          {visualPhase === "completed" && (
            <ResultsView
              key="results"
              events={events}
              participants={participants}
              cumulativeScores={gameState.scores}
              winners={winners}
              isFullTie={isFullTie}
              gameType={gameTypeName}
            />
          )}
        </AnimatePresence>

        {visualPhase !== "completed" && (
          <RoundProgress
            round={currentRound}
            totalRounds={totalRounds}
            gameTypeName={gameTypeName}
          />
        )}
      </div>
    </div>
  );
}
