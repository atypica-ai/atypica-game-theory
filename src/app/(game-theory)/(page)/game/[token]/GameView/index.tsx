"use client";

import { GameSessionDetail } from "@/app/(game-theory)/actions";
import {
  GameSessionParticipant,
  GameTimeline,
  GameTimelineEvent,
  HUMAN_PLAYER_ID,
  HumanDecisionSubmittedEvent,
  HumanDiscussionSubmittedEvent,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
  RoundResultEvent,
} from "@/app/(game-theory)/types";
import { ReplayView } from "./ReplayView";

// ── Shared types ────────────────────────────────────────────────────────────

export type GamePhase = "starting" | "discussion" | "decision" | "reveal" | "completed";

export interface GameState {
  latestRound: number;
  completedRounds: number[];
  activeRound: number | null;
  phase: GamePhase;
  rounds: RoundData[];
  scores: Record<number, number>;
  decidedPlayers: Set<number>;
  discussedPlayers: Set<number>;
  discussionCount: number;
}

export type RoundData = {
  roundId: number;
  discussions: PersonaDiscussionEvent[];
  decisions: PersonaDecisionEvent[];
  result: RoundResultEvent | null;
};

// ── Shared helpers ──────────────────────────────────────────────────────────

export function getRoundPayoffSum(round: RoundData): number {
  if (!round.result) return 0;
  return Object.values(round.result.payoffs).reduce((acc, v) => acc + v, 0);
}

export function getScoresUpToRound(allRoundData: RoundData[], upToRoundId: number): Record<number, number> {
  const scores: Record<number, number> = {};
  for (const round of allRoundData) {
    if (round.roundId > upToRoundId) break;
    if (round.result) {
      for (const [id, v] of Object.entries(round.result.payoffs)) {
        scores[Number(id)] = (scores[Number(id)] ?? 0) + v;
      }
    }
  }
  return scores;
}

export function formatGameTypeName(key: string): string {
  return key
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function hasRound(e: GameTimelineEvent): e is GameTimelineEvent & { round: number } {
  return "round" in e && typeof e.round === "number";
}

// ── State derivation ────────────────────────────────────────────────────────

export function deriveGameState(events: GameTimelineEvent[], isCompleted: boolean): GameState {
  // 1. Find highest round in ANY event
  let latestRound = 0;
  for (const e of events) {
    if (hasRound(e) && e.round > latestRound) latestRound = e.round;
  }

  // 2. Completed rounds
  const completedRoundSet = new Set<number>();
  for (const e of events) {
    if (e.type === "round-result") completedRoundSet.add(e.round);
  }
  const completedRounds = [...completedRoundSet].sort((a, b) => a - b);

  // 3. Active round
  const activeRound = latestRound > 0 && !completedRoundSet.has(latestRound) ? latestRound : null;

  // 4. Phase detection for active round
  let phase: GamePhase = isCompleted ? "completed" : "starting";
  if (!isCompleted && activeRound !== null) {
    let hasDecision = false;
    let hasDiscussion = false;
    let hasResult = false;
    for (const e of events) {
      if (!hasRound(e) || e.round !== activeRound) continue;
      if (e.type === "round-result") hasResult = true;
      if (e.type === "persona-decision" || e.type === "human-decision-pending") hasDecision = true;
      if (e.type === "persona-discussion" || e.type === "human-discussion-pending") hasDiscussion = true;
    }
    if (hasResult) phase = "reveal";
    else if (hasDecision) phase = "decision";
    else if (hasDiscussion) phase = "discussion";
    else phase = "starting";
  }

  // 5. Grouped round data
  const rounds = groupEventsByRound(events);

  // 6. Cumulative scores
  const scores: Record<number, number> = {};
  for (const e of events) {
    if (e.type === "round-result") {
      for (const [id, v] of Object.entries(e.payoffs)) {
        scores[Number(id)] = (scores[Number(id)] ?? 0) + v;
      }
    }
  }

  // 7. Per-player status in active round
  const decidedPlayers = new Set<number>();
  const discussedPlayers = new Set<number>();
  if (activeRound !== null) {
    for (const e of events) {
      if (hasRound(e) && e.round === activeRound) {
        if (e.type === "persona-decision") decidedPlayers.add(e.personaId);
        if (e.type === "human-decision-submitted") decidedPlayers.add(HUMAN_PLAYER_ID);
        if (e.type === "persona-discussion") discussedPlayers.add(e.personaId);
        if (e.type === "human-discussion-submitted") discussedPlayers.add(HUMAN_PLAYER_ID);
      }
    }
  }

  return {
    latestRound,
    completedRounds,
    activeRound,
    phase,
    rounds,
    scores,
    decidedPlayers,
    discussedPlayers,
    discussionCount: discussedPlayers.size,
  };
}

// ── Event grouping ──────────────────────────────────────────────────────────

export function groupEventsByRound(events: GameTimeline): RoundData[] {
  const map = new Map<number, RoundData>();

  // Pass 1: canonical events
  for (const e of events) {
    if (e.type === "persona-discussion") {
      const r = map.get(e.round) ?? { roundId: e.round, discussions: [], decisions: [], result: null };
      r.discussions.push(e);
      map.set(e.round, r);
    } else if (e.type === "persona-decision") {
      const r = map.get(e.round) ?? { roundId: e.round, discussions: [], decisions: [], result: null };
      r.decisions.push(e);
      map.set(e.round, r);
    } else if (e.type === "round-result") {
      const r = map.get(e.round) ?? { roundId: e.round, discussions: [], decisions: [], result: null };
      r.result = e;
      map.set(e.round, r);
    }
  }

  // Pass 2: provisional human events — fill gaps where orchestration hasn't
  // written the canonical event yet
  for (const e of events) {
    if (e.type === "human-decision-submitted") {
      const r = map.get(e.round) ?? { roundId: e.round, discussions: [], decisions: [], result: null };
      if (!r.decisions.some((d) => d.personaId === HUMAN_PLAYER_ID)) {
        r.decisions.push(synthesizeDecision(e));
      }
      map.set(e.round, r);
    } else if (e.type === "human-discussion-submitted") {
      const r = map.get(e.round) ?? { roundId: e.round, discussions: [], decisions: [], result: null };
      if (!r.discussions.some((d) => d.personaId === HUMAN_PLAYER_ID)) {
        r.discussions.push(synthesizeDiscussion(e));
      }
      map.set(e.round, r);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.roundId - b.roundId);
}

function synthesizeDecision(e: HumanDecisionSubmittedEvent): PersonaDecisionEvent {
  return {
    type: "persona-decision",
    round: e.round,
    personaId: HUMAN_PLAYER_ID,
    personaName: "You",
    reasoning: null,
    content: e.content,
  };
}

function synthesizeDiscussion(e: HumanDiscussionSubmittedEvent): PersonaDiscussionEvent {
  return {
    type: "persona-discussion",
    round: e.round,
    personaId: HUMAN_PLAYER_ID,
    personaName: "You",
    reasoning: null,
    content: e.content,
  };
}

// ── Lazy-loaded views ───────────────────────────────────────────────────────

import dynamic from "next/dynamic";

const AIGameView = dynamic(() => import("./AIGameView").then((m) => ({ default: m.AIGameView })));
const HumanGameView = dynamic(() => import("./HumanGameView").then((m) => ({ default: m.HumanGameView })));

// ── Router ──────────────────────────────────────────────────────────────────

export function GameView({
  initialData,
  token,
  replay = false,
}: {
  initialData: GameSessionDetail;
  token: string;
  replay?: boolean;
}) {
  if (replay) return <ReplayView initialData={initialData} />;

  const hasHuman = initialData.extra?.participants?.some(
    (p: GameSessionParticipant) => p.personaId === HUMAN_PLAYER_ID,
  );

  if (hasHuman) {
    return <HumanGameView initialData={initialData} token={token} />;
  }
  return <AIGameView initialData={initialData} token={token} />;
}
