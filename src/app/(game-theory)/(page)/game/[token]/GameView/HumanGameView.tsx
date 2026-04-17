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
  abortHumanGame,
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
import { PhaseProgress, VisualPhase } from "./human/PhaseProgress";
import { RoundProgress } from "./human/RoundProgress";
import { DiscussionCard } from "./human/DiscussionCard";
import { CommitmentCard } from "./human/CommitmentCard";
import { AnalyzeCard } from "./human/AnalyzeCard";
import { FinalResultsCard } from "./human/FinalResultsCard";
import { ErrorDialog } from "./human/ErrorDialog";
import { RulesPopover } from "./human/RulesPopover";

import { useIsMobile } from "@/lib/useIsMobile";

const SILENT_DISCUSSION = "(said nothing)";

// ── Game step types ────────────────────────────────────────────────────────
//
// "discussion" — single phase for AI + human concurrent discussion.
//   AI speakers fire one-by-one in a loop (decoupled from step machine via
//   fireAIDiscussions ref). Human can submit at any time. Their message
//   writes to DB atomically and appears before the in-flight AI's response.
//   After human speaks, a PROCEED button appears (disabled until all done).
//
// "watching" — human submitted decision, AI decisions streaming in on AnalyzeCard.
//   AI decision fetches continue independently. Each arrival re-renders the card.

type GameStep =
  | { phase: "roundStart"; roundId: number }
  | { phase: "discussion"; roundId: number }    // AI loop + human input concurrent
  | { phase: "decision"; roundId: number }      // human sees CommitmentCard
  | { phase: "watching"; roundId: number }       // human submitted, AI still deciding
  | { phase: "settling"; roundId: number }       // payoff calculation in flight
  | { phase: "reveal"; roundId: number }         // results shown, PROCEED button
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

  // Check discussion state
  if (discussionRounds > 0) {
    const discussions = events.filter(
      (e): e is PersonaDiscussionEvent => e.type === "persona-discussion" && e.round === roundId,
    );
    const aiParticipants = participants.filter((p) => p.personaId !== HUMAN_PLAYER_ID);
    const allAISpoken = discussions.filter((d) => d.personaId !== HUMAN_PLAYER_ID).length >= aiParticipants.length;
    const humanSpoken = discussions.some((d) => d.personaId === HUMAN_PLAYER_ID);

    // If not everyone has spoken, stay in discussion
    if (!allAISpoken || !humanSpoken) return { phase: "discussion", roundId };
  }

  return { phase: "decision", roundId };
}

// ── Component ──────────────────────────────────────────────────────────────

export function HumanGameView({ initialData, token }: { initialData: GameSessionDetail; token: string }) {
  const participants: GameSessionParticipant[] = useMemo(
    () => initialData.extra?.participants ?? [],
    [initialData.extra?.participants],
  );
  const gameTypeName = initialData.gameType;
  const gameType = useMemo(() => getGameType(gameTypeName), [gameTypeName]);
  const discussionRounds = initialData.extra?.discussionRounds ?? gameType.discussionRounds;
  const totalRounds = gameType.horizon.type === "fixed" ? gameType.horizon.rounds : null;
  const humanParticipant = participants.find((p) => p.personaId === HUMAN_PLAYER_ID);
  const humanName = humanParticipant?.name ?? "You";

  // ── Event timeline ────────────────────────────────────────────────────
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

  const [currentSpeakerId, setCurrentSpeakerId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appendEvents = useCallback((...newEvents: GameTimelineEvent[]) => {
    const next = [...eventsRef.current, ...newEvents];
    eventsRef.current = next;
    setEvents(next);
  }, []);

  // ── AI discussion fetcher (decoupled — survives step changes) ─────────
  //
  // Fires AI speakers one-by-one. Each call reads fresh timeline from DB,
  // so if the human submitted mid-flight, the NEXT AI speaker sees it.
  // The human's atomic DB write lands before the in-flight AI's write
  // because the AI hasn't finished generating yet.

  const aiDiscussionRoundRef = useRef<number>(-1);
  const aiDiscussionDoneRef = useRef(false);

  const fireAIDiscussions = useCallback((roundId: number) => {
    // Reset guard so retries can re-enter
    aiDiscussionRoundRef.current = roundId;
    aiDiscussionDoneRef.current = false;

    const aiParticipants = participants.filter((p) => p.personaId !== HUMAN_PLAYER_ID);

    (async () => {
      // Sequential: pick a random unspeaking AI each iteration.
      // Re-check eventsRef each time so we see human's message if they spoke mid-loop.
      while (true) {
        const spokenIds = new Set(
          eventsRef.current
            .filter((e): e is PersonaDiscussionEvent => e.type === "persona-discussion" && e.round === roundId)
            .map((e) => e.personaId),
        );
        const remaining = aiParticipants.filter((p) => !spokenIds.has(p.personaId));
        if (remaining.length === 0) break;

        const next = remaining[Math.floor(Math.random() * remaining.length)];
        setCurrentSpeakerId(next.personaId);
        try {
          const res = await runAIDiscussionFor(token, next.personaId, roundId);
          if (res.success) {
            appendEvents(res.event);
          } else {
            setCurrentSpeakerId(null);
            setError(`${next.name} failed to respond: ${res.message}`);
            return; // Stop loop — ErrorDialog will show, user can Retry
          }
        } catch (err) {
          setCurrentSpeakerId(null);
          setError(`${next.name} failed to respond: ${(err as Error).message}`);
          return;
        }
      }

      setCurrentSpeakerId(null);
      aiDiscussionDoneRef.current = true;
      // Force re-render so DiscussionCard picks up allSpoken
      setEvents((prev) => [...prev]);
    })();
  }, [participants, token, appendEvents]);

  // ── AI decision fetcher (decoupled — survives step changes) ───────────

  const aiDecisionRoundRef = useRef<number>(-1);

  const fireAIDecisions = useCallback((roundId: number) => {
    // Reset guard so retries can re-enter
    aiDecisionRoundRef.current = roundId;

    const aiParticipants = participants.filter((p) => p.personaId !== HUMAN_PLAYER_ID);

    // Fire decisions for AI that haven't decided yet (supports retry after partial failure)
    const alreadyDecided = new Set(
      eventsRef.current
        .filter((e): e is PersonaDecisionEvent => e.type === "persona-decision" && e.round === roundId)
        .map((e) => e.personaId),
    );
    const pending = aiParticipants.filter((p) => !alreadyDecided.has(p.personaId));

    Promise.all(
      pending.map(async (p) => {
        try {
          const res = await fetch("/api/internal/game-ai-decision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, personaId: p.personaId, roundId }),
          });
          const data = await res.json();
          if (data.success) {
            appendEvents(data.event);
          } else {
            throw new Error(data.message ?? "AI decision failed");
          }
        } catch (err) {
          setError(`${p.name} failed to decide: ${(err as Error).message}`);
          throw err; // Propagate so Promise.all rejects
        }
      }),
    ).then(() => {
      const currentStep = stepRef.current;
      if (currentStep.phase === "watching" && "roundId" in currentStep && currentStep.roundId === roundId) {
        setStep({ phase: "settling", roundId });
      }
    }).catch(() => {
      // Error already set above — ErrorDialog will show
    });
  }, [participants, token, appendEvents]);

  // ── Derived display state ─────────────────────────────────────────────

  const currentRound = "roundId" in step ? step.roundId : (gameState.completedRounds.at(-1) ?? 1);

  const visualPhase: VisualPhase = useMemo(() => {
    switch (step.phase) {
      case "roundStart": return discussionRounds > 0 ? "discussion" : "commitment";
      case "discussion": return "discussion";
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

  const humanHasSpoken = useMemo(() =>
    currentRoundData.discussions.some((d) => d.personaId === HUMAN_PLAYER_ID),
    [currentRoundData.discussions],
  );
  const allSpoken = useMemo(() => {
    const spokenIds = new Set(currentRoundData.discussions.map((d) => d.personaId));
    return participants.every((p) => spokenIds.has(p.personaId));
  }, [currentRoundData.discussions, participants]);

  // ── Step machine effect ───────────────────────────────────────────────

  useEffect(() => {
    const passive = ["completed", "watching", "reveal"];
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
              ? { phase: "discussion", roundId: step.roundId }
              : { phase: "decision", roundId: step.roundId });
            break;
          }

          case "discussion": {
            fireAIDiscussions(step.roundId);
            break;
          }

          case "decision": {
            fireAIDecisions(step.roundId);
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
            // Always go to reveal — user clicks PROCEED or FINALIZE
            if (res.isTerminated) {
              await completeHumanGame(token);
              setStatus("completed");
            }
            setStep({ phase: "reveal", roundId: step.roundId });
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
      if (step.phase !== "discussion" || !("roundId" in step)) return;
      const trimmed = content.trim() || SILENT_DISCUSSION;
      appendEvents({
        type: "persona-discussion",
        personaId: HUMAN_PLAYER_ID,
        personaName: humanName,
        reasoning: null,
        content: trimmed,
        round: step.roundId,
      });
      void submitHumanDiscussion(token, content, step.roundId);
    },
    [token, step, humanName, appendEvents],
  );

  const handleProceedToDecision = useCallback(() => {
    if (step.phase === "discussion" && "roundId" in step) {
      setStep({ phase: "decision", roundId: step.roundId });
    }
  }, [step]);

  const handleDecisionSubmit = useCallback(
    (action: Record<string, unknown>) => {
      if (step.phase !== "decision" || !("roundId" in step)) return;
      const roundId = step.roundId;
      appendEvents({
        type: "persona-decision",
        personaId: HUMAN_PLAYER_ID,
        personaName: humanName,
        reasoning: null,
        content: action,
        round: roundId,
      });
      void submitHumanDecision(token, action, roundId).then(() => {
        const currentEvents = eventsRef.current;
        const allDecisions = currentEvents.filter(
          (e): e is PersonaDecisionEvent => e.type === "persona-decision" && e.round === roundId,
        );
        if (allDecisions.length === participants.length) {
          setStep({ phase: "settling", roundId });
        }
      });
      setStep({ phase: "watching", roundId });
    },
    [token, step, humanName, appendEvents, participants.length],
  );

  const handleProceed = useCallback(() => {
    if (step.phase !== "reveal") return;
    setStep({ phase: "roundStart", roundId: step.roundId + 1 });
  }, [step]);

  const handleViewFinalResults = useCallback(() => {
    setStep({ phase: "completed" });
  }, []);

  // Error recovery: retry re-triggers current step; abort ends the game
  const handleRetry = useCallback(() => {
    setError(null);
    // Reset round guards so fetchers can re-enter on retry
    aiDiscussionRoundRef.current = -1;
    aiDecisionRoundRef.current = -1;
    // Re-trigger the current step by creating a new object reference
    setStep((s) => ({ ...s }));
  }, []);

  const handleAbort = useCallback(() => {
    void abortHumanGame(token, error ?? "Game aborted by player").then(() => {
      window.location.href = "/play/new";
    });
  }, [token, error]);

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

  const showChrome = visualPhase !== "completed";
  const isMobile = useIsMobile();
  const chromeHeight = isMobile ? "8vh" : "15vh";

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--gt-bg)" }}>
      {/* Error dialog — overlay on top of current game state */}
      {error && (
        <ErrorDialog message={error} onRetry={handleRetry} onAbort={handleAbort} />
      )}
      {/* ── Top zone: phase progress (fixed at ~15%) ──────────────────── */}
      {showChrome && (
        <div className="shrink-0 flex items-end justify-center" style={{ height: chromeHeight, paddingBottom: "1rem" }}>
          <PhaseProgress phase={visualPhase} hasDiscussion={discussionRounds > 0} />
        </div>
      )}

      {/* ── Middle zone: card area (fills remaining space, vertically centered, scrollable) ── */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center overflow-y-auto px-6"
        style={{ paddingTop: showChrome ? "0" : undefined }}
      >
        <div className="w-full max-w-xl py-4">
          {showChrome && (
            <div className="flex justify-end mb-2">
              <RulesPopover gameTypeName={gameTypeName} gameDisplayName={gameType.displayName} />
            </div>
          )}
          <AnimatePresence mode="wait">
            {visualPhase === "discussion" && (
              <DiscussionCard
                key={`disc-${currentRound}`}
                discussions={currentRoundData.discussions}
                participants={participants}
                currentSpeakerId={currentSpeakerId}
                humanHasSpoken={humanHasSpoken}
                allSpoken={allSpoken}
                onSendMessage={handleSendDiscussion}
                onProceedToDecision={handleProceedToDecision}
              />
            )}
            {visualPhase === "commitment" && (
              <CommitmentCard
                key={`commit-${currentRound}`}
                roundId={currentRound}
                gameTypeName={gameTypeName}
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
              <FinalResultsCard
                key="results"
                participants={participants}
                cumulativeScores={gameState.scores}
                winners={winners}
                isFullTie={isFullTie}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom zone: round progress (fixed at ~15%) ───────────────── */}
      {showChrome && (
        <div className="shrink-0 flex items-start justify-center" style={{ height: chromeHeight, paddingTop: "1rem" }}>
          <RoundProgress round={currentRound} totalRounds={totalRounds} gameTypeName={gameTypeName} />
        </div>
      )}
    </div>
  );
}
