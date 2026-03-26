"use client";

import { GameSessionTimeline, RoundRecord } from "@/app/(game-theory)/types";
import { useMemo, useState, useEffect, useCallback } from "react";

// ── Step type definitions ───────────────────────────────────────────────────

type ReplayStep =
  | { type: "game-open" }
  | { type: "round-start"; roundId: number }
  | { type: "player-deliberating"; roundId: number; playerId: string }
  | { type: "player-revealed"; roundId: number; playerId: string }
  | { type: "round-payoffs"; roundId: number }
  | { type: "round-end"; roundId: number }
  | { type: "game-complete" };

// Duration per step type in milliseconds
const STEP_DURATIONS: Record<ReplayStep["type"], number> = {
  "game-open": 1200,
  "round-start": 800,
  "player-deliberating": 1000,
  "player-revealed": 500,
  "round-payoffs": 1200,
  "round-end": 800,
  "game-complete": 0, // terminal — no timer
};

// ── Display state ───────────────────────────────────────────────────────────

export interface GameReplayDisplayState {
  phase: "playing" | "complete";
  /** roundId currently being played, or null when between rounds */
  currentRoundId: number | null;
  /** playerIds whose card shows the deliberating spinner */
  playersDeliberating: Set<string>;
  /** playerIds whose action badge is visible */
  playersRevealed: Set<string>;
  /** roundId for which payoffs are currently shown (null = not yet) */
  showPayoffsForRound: number | null;
  /** rounds that have fully finished (shown in history strip) */
  visibleCompletedRounds: RoundRecord[];
  /** 0–100 for the progress bar */
  progress: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildReplaySteps(timeline: GameSessionTimeline): ReplayStep[] {
  const steps: ReplayStep[] = [{ type: "game-open" }];

  for (const round of timeline.rounds) {
    steps.push({ type: "round-start", roundId: round.roundId });

    for (const participant of timeline.meta.participants) {
      steps.push({ type: "player-deliberating", roundId: round.roundId, playerId: participant.playerId });
      steps.push({ type: "player-revealed", roundId: round.roundId, playerId: participant.playerId });
    }

    steps.push({ type: "round-payoffs", roundId: round.roundId });
    steps.push({ type: "round-end", roundId: round.roundId });
  }

  steps.push({ type: "game-complete" });
  return steps;
}

function computeDisplayState(
  steps: ReplayStep[],
  stepIndex: number,
  rounds: RoundRecord[],
): GameReplayDisplayState {
  let phase: GameReplayDisplayState["phase"] = "playing";
  let currentRoundId: number | null = null;
  const playersDeliberating = new Set<string>();
  const playersRevealed = new Set<string>();
  let showPayoffsForRound: number | null = null;
  const completedRoundIds = new Set<number>();

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
        playersDeliberating.add(step.playerId);
        break;

      case "player-revealed":
        playersDeliberating.delete(step.playerId);
        playersRevealed.add(step.playerId);
        break;

      case "round-payoffs":
        showPayoffsForRound = step.roundId;
        break;

      case "round-end":
        // Round moves to history; keep players visible until next round-start
        completedRoundIds.add(step.roundId);
        break;

      case "game-complete":
        phase = "complete";
        break;
    }
  }

  const visibleCompletedRounds = rounds.filter((r) => completedRoundIds.has(r.roundId));
  const totalSteps = steps.length - 1; // exclude game-complete from denominator
  const progress = totalSteps > 0 ? (clampedIndex / totalSteps) * 100 : 100;

  return {
    phase,
    currentRoundId,
    playersDeliberating,
    playersRevealed,
    showPayoffsForRound,
    visibleCompletedRounds,
    progress,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useGameReplay(timeline: GameSessionTimeline): {
  displayState: GameReplayDisplayState;
  isIntroComplete: boolean;
  startPlayback: () => void;
  skipToEnd: () => void;
  seek: (progress: number) => void;
} {
  const steps = useMemo(() => buildReplaySteps(timeline), [timeline]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isIntroComplete, setIsIntroComplete] = useState(false);

  const isPlaying = isIntroComplete && stepIndex < steps.length - 1;

  // Advance one step at a time, using per-step durations
  useEffect(() => {
    if (!isPlaying) return;
    const step = steps[stepIndex];
    if (!step) return;
    const duration = STEP_DURATIONS[step.type];
    if (duration === 0) return; // terminal step
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
    () => computeDisplayState(steps, stepIndex, timeline.rounds),
    [steps, stepIndex, timeline.rounds],
  );

  return { displayState, isIntroComplete, startPlayback, skipToEnd, seek };
}
