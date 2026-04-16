"use client";

import {
  GameSessionParticipant,
  GameTimeline,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { groupEventsByRound, RoundData } from "../index";

// ── Phase type ──────────────────────────────────────────────────────────────

export type ReplayPhase = "discussion" | "analyze" | "completed";

// ── Timing constants ────────────────────────────────────────────────────────

const DISCUSSION_INTERVAL_MS = 1500;
const DECISION_INTERVAL_MS = 800;
const PAYOFF_DELAY_MS = 600;

// ── Display state ───────────────────────────────────────────────────────────

export interface CinematicDisplayState {
  currentRoundId: number;
  phase: ReplayPhase;
  /** Discussions revealed so far (grows over time) */
  visibleDiscussions: PersonaDiscussionEvent[];
  /** PersonaId of the next speaker being "typed" */
  typingSpeakerId: number | null;
  /** Whether all discussions have been revealed */
  allDiscussionsDone: boolean;
  /** Decisions revealed so far (grows over time) */
  visibleDecisions: PersonaDecisionEvent[];
  /** Round result — null until all decisions revealed + brief delay */
  roundResult: RoundResultEvent | null;
  /** Whether payoffs are visible (proceed enabled) */
  allDecisionsDone: boolean;
  /** All round data */
  allRounds: RoundData[];
  /** Whether we're on the final results screen */
  isComplete: boolean;
  /** Whether this is the last round */
  isFinalRound: boolean;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useCinematicReplay(
  events: GameTimeline,
  _participants: GameSessionParticipant[],
  discussionRounds: number,
) {
  const rounds = useMemo(() => groupEventsByRound(events), [events]);
  const hasDiscussion = discussionRounds > 0;

  const firstRoundId = rounds[0]?.roundId ?? 1;
  const lastRoundId = rounds[rounds.length - 1]?.roundId ?? 1;

  // ── Position state ────────────────────────────────────────────────────
  const [currentRoundId, setCurrentRoundId] = useState(firstRoundId);
  const [phase, setPhase] = useState<ReplayPhase>(
    hasDiscussion ? "discussion" : "analyze",
  );
  const [started, setStarted] = useState(false);

  // ── Streaming state ───────────────────────────────────────────────────
  const [discussionIndex, setDiscussionIndex] = useState(0); // how many discussions revealed
  const [decisionIndex, setDecisionIndex] = useState(0); // how many decisions revealed
  const [showPayoffs, setShowPayoffs] = useState(false);

  const currentRound = useMemo(
    () => rounds.find((r) => r.roundId === currentRoundId) ?? rounds[0],
    [rounds, currentRoundId],
  );

  const isFinalRound = currentRoundId === lastRoundId;
  const isComplete = phase === "completed";

  const allDiscussions = useMemo(
    () => currentRound?.discussions ?? [],
    [currentRound?.discussions],
  );
  const allDecisions = useMemo(
    () => currentRound?.decisions ?? [],
    [currentRound?.decisions],
  );

  const visibleDiscussions = useMemo(
    () => allDiscussions.slice(0, discussionIndex),
    [allDiscussions, discussionIndex],
  );
  const allDiscussionsDone = discussionIndex >= allDiscussions.length;

  const visibleDecisions = useMemo(
    () => allDecisions.slice(0, decisionIndex),
    [allDecisions, decisionIndex],
  );
  const allDecisionsDone = showPayoffs;
  const roundResult = showPayoffs ? (currentRound?.result ?? null) : null;

  // Typing indicator: next speaker (only during discussion streaming)
  const typingSpeakerId = useMemo(() => {
    if (phase !== "discussion" || allDiscussionsDone) return null;
    const next = allDiscussions[discussionIndex];
    return next?.personaId ?? null;
  }, [phase, allDiscussionsDone, allDiscussions, discussionIndex]);

  // ── Timers for streaming ──────────────────────────────────────────────

  // Discussion streaming timer
  const discussionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!started || phase !== "discussion" || allDiscussionsDone) return;
    discussionTimerRef.current = setTimeout(() => {
      setDiscussionIndex((i) => i + 1);
    }, DISCUSSION_INTERVAL_MS);
    return () => {
      if (discussionTimerRef.current) clearTimeout(discussionTimerRef.current);
    };
  }, [started, phase, discussionIndex, allDiscussionsDone]);

  // Decision streaming timer
  const decisionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allDecisionsRevealed = decisionIndex >= allDecisions.length;

  useEffect(() => {
    if (!started || phase !== "analyze") return;

    if (!allDecisionsRevealed) {
      // Reveal next decision
      decisionTimerRef.current = setTimeout(() => {
        setDecisionIndex((i) => i + 1);
      }, DECISION_INTERVAL_MS);
    } else if (!showPayoffs) {
      // All decisions revealed, show payoffs after brief delay
      decisionTimerRef.current = setTimeout(() => {
        setShowPayoffs(true);
      }, PAYOFF_DELAY_MS);
    }

    return () => {
      if (decisionTimerRef.current) clearTimeout(decisionTimerRef.current);
    };
  }, [started, phase, decisionIndex, allDecisionsRevealed, showPayoffs]);

  // ── Reset streaming when position changes ─────────────────────────────

  const resetStreaming = useCallback(() => {
    setDiscussionIndex(0);
    setDecisionIndex(0);
    setShowPayoffs(false);
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────

  const proceed = useCallback(() => {
    if (phase === "discussion") {
      resetStreaming();
      setPhase("analyze");
    } else if (phase === "analyze") {
      if (isFinalRound) {
        setPhase("completed");
      } else {
        const nextRound = rounds.find((r) => r.roundId > currentRoundId);
        if (nextRound) {
          resetStreaming();
          setCurrentRoundId(nextRound.roundId);
          setPhase(hasDiscussion ? "discussion" : "analyze");
        } else {
          setPhase("completed");
        }
      }
    }
  }, [phase, isFinalRound, rounds, currentRoundId, hasDiscussion, resetStreaming]);

  const goToRound = useCallback(
    (roundId: number) => {
      const target = rounds.find((r) => r.roundId === roundId);
      if (!target) return;
      resetStreaming();
      setCurrentRoundId(roundId);
      setPhase(hasDiscussion ? "discussion" : "analyze");
      setStarted(true);
    },
    [rounds, hasDiscussion, resetStreaming],
  );

  const goToPhase = useCallback(
    (roundId: number, targetPhase: "discussion" | "analyze") => {
      const target = rounds.find((r) => r.roundId === roundId);
      if (!target) return;
      resetStreaming();
      setCurrentRoundId(roundId);
      if (targetPhase === "discussion" && !hasDiscussion) {
        setPhase("analyze");
      } else {
        setPhase(targetPhase);
      }
      setStarted(true);
    },
    [rounds, hasDiscussion, resetStreaming],
  );

  const restart = useCallback(() => {
    resetStreaming();
    setCurrentRoundId(firstRoundId);
    setPhase(hasDiscussion ? "discussion" : "analyze");
    setStarted(true);
  }, [firstRoundId, hasDiscussion, resetStreaming]);

  const skipToEnd = useCallback(() => {
    setPhase("completed");
    setStarted(true);
  }, []);

  const startReplay = useCallback(() => {
    setStarted(true);
  }, []);

  // ── Build display state ───────────────────────────────────────────────

  const displayState: CinematicDisplayState = useMemo(
    () => ({
      currentRoundId,
      phase,
      visibleDiscussions,
      typingSpeakerId,
      allDiscussionsDone,
      visibleDecisions,
      roundResult,
      allDecisionsDone,
      allRounds: rounds,
      isComplete,
      isFinalRound,
    }),
    [
      currentRoundId, phase, visibleDiscussions, typingSpeakerId,
      allDiscussionsDone, visibleDecisions, roundResult, allDecisionsDone,
      rounds, isComplete, isFinalRound,
    ],
  );

  return {
    displayState,
    started,
    startReplay,
    proceed,
    goToRound,
    goToPhase,
    restart,
    skipToEnd,
  };
}
