"use client";

import {
  GameSessionParticipant,
  GameTimeline,
  PersonaDecisionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import { useCallback, useEffect, useMemo, useState } from "react";

// ── Step type definitions ────────────────────────────────────────────────────

type ReplayStep =
  | { type: "game-open" }
  | { type: "round-start"; roundId: number }
  | { type: "player-deliberating"; roundId: number; personaId: number }
  | { type: "player-revealed"; roundId: number; personaId: number }
  | { type: "round-payoffs"; roundId: number }
  | { type: "round-end"; roundId: number }
  | { type: "game-complete" };

const STEP_DURATIONS: Record<ReplayStep["type"], number> = {
  "game-open": 1200,
  "round-start": 800,
  "player-deliberating": 1000,
  "player-revealed": 500,
  "round-payoffs": 1200,
  "round-end": 800,
  "game-complete": 0,
};

// ── Display state ────────────────────────────────────────────────────────────

export interface GameReplayDisplayState {
  phase: "playing" | "complete";
  currentRoundId: number | null;
  playersDeliberating: Set<number>; // personaIds
  playersRevealed: Set<number>; // personaIds
  showPayoffsForRound: number | null;
  visibleCompletedRoundIds: Set<number>;
  progress: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildReplaySteps(
  events: GameTimeline,
  participants: GameSessionParticipant[],
): ReplayStep[] {
  const completedRoundIds = events
    .filter((e): e is RoundResultEvent => e.type === "round-result")
    .map((e) => e.round)
    .sort((a, b) => a - b);

  const steps: ReplayStep[] = [{ type: "game-open" }];

  for (const roundId of completedRoundIds) {
    steps.push({ type: "round-start", roundId });

    // Deliberate + reveal in decision order (order they appear in events)
    const decisions = events.filter(
      (e): e is PersonaDecisionEvent => e.type === "persona-decision" && e.round === roundId,
    );
    const orderedPersonaIds = decisions.map((e) => e.personaId);

    // Include any participants not yet seen (in case of incomplete rounds)
    for (const p of participants) {
      if (!orderedPersonaIds.includes(p.personaId)) orderedPersonaIds.push(p.personaId);
    }

    for (const personaId of orderedPersonaIds) {
      steps.push({ type: "player-deliberating", roundId, personaId });
      steps.push({ type: "player-revealed", roundId, personaId });
    }

    steps.push({ type: "round-payoffs", roundId });
    steps.push({ type: "round-end", roundId });
  }

  steps.push({ type: "game-complete" });
  return steps;
}

function computeDisplayState(steps: ReplayStep[], stepIndex: number): GameReplayDisplayState {
  let phase: GameReplayDisplayState["phase"] = "playing";
  let currentRoundId: number | null = null;
  const playersDeliberating = new Set<number>();
  const playersRevealed = new Set<number>();
  let showPayoffsForRound: number | null = null;
  const visibleCompletedRoundIds = new Set<number>();

  const clampedIndex = Math.min(stepIndex, steps.length - 1);

  for (let i = 0; i <= clampedIndex; i++) {
    const step = steps[i];
    if (!step) break;

    switch (step.type) {
      case "game-open":
        break;
      case "round-start":
        currentRoundId = step.roundId;
        playersDeliberating.clear();
        playersRevealed.clear();
        showPayoffsForRound = null;
        break;
      case "player-deliberating":
        playersDeliberating.add(step.personaId);
        break;
      case "player-revealed":
        playersDeliberating.delete(step.personaId);
        playersRevealed.add(step.personaId);
        break;
      case "round-payoffs":
        showPayoffsForRound = step.roundId;
        break;
      case "round-end":
        visibleCompletedRoundIds.add(step.roundId);
        break;
      case "game-complete":
        phase = "complete";
        break;
    }
  }

  const totalSteps = steps.length - 1;
  const progress = totalSteps > 0 ? (clampedIndex / totalSteps) * 100 : 100;

  return {
    phase,
    currentRoundId,
    playersDeliberating,
    playersRevealed,
    showPayoffsForRound,
    visibleCompletedRoundIds,
    progress,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGameReplay(
  events: GameTimeline,
  participants: GameSessionParticipant[],
): {
  displayState: GameReplayDisplayState;
  isIntroComplete: boolean;
  startPlayback: () => void;
  skipToEnd: () => void;
  seek: (progress: number) => void;
} {
  const steps = useMemo(
    () => buildReplaySteps(events, participants),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(events), JSON.stringify(participants)],
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [isIntroComplete, setIsIntroComplete] = useState(false);

  const isPlaying = isIntroComplete && stepIndex < steps.length - 1;

  useEffect(() => {
    if (!isPlaying) return;
    const step = steps[stepIndex];
    if (!step) return;
    const duration = STEP_DURATIONS[step.type];
    if (duration === 0) return;
    const timer = setTimeout(() => setStepIndex((i) => i + 1), duration);
    return () => clearTimeout(timer);
  }, [isPlaying, stepIndex, steps]);

  const startPlayback = useCallback(() => setIsIntroComplete(true), []);
  const skipToEnd = useCallback(() => setStepIndex(steps.length - 1), [steps.length]);
  const seek = useCallback(
    (progress: number) => {
      const totalSteps = steps.length - 1;
      const target = Math.round((Math.max(0, Math.min(100, progress)) / 100) * totalSteps);
      setStepIndex(target);
    },
    [steps.length],
  );

  const displayState = useMemo(
    () => computeDisplayState(steps, stepIndex),
    [steps, stepIndex],
  );

  return { displayState, isIntroComplete, startPlayback, skipToEnd, seek };
}
