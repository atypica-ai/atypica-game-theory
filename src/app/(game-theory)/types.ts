import { LLMModelName } from "@/ai/provider";

// Reserved personaId for human players (all real persona IDs are positive integers)
export const HUMAN_PLAYER_ID = -1;

// Runtime-only persona session (not persisted)
export interface GamePersonaSession {
  personaId: number; // HUMAN_PLAYER_ID (-1) for human players
  personaName: string;
  systemPrompt: string;
  modelName: LLMModelName;
  isHuman?: true; // set only when personaId === HUMAN_PLAYER_ID
  userId?: number; // set only for human players
}

// ── Timeline event types ────────────────────────────────────────────────────

// System announcement: game-level (no round) or round-level (round present)
export interface SystemEvent {
  type: "system";
  content: string;
  round?: number;
}

// Free-form speech during the discussion phase before decisions
export interface PersonaDiscussionEvent {
  type: "persona-discussion";
  personaId: number;
  personaName: string;
  reasoning: string | null; // from model's native reasoning field; null if unsupported
  content: string;
  round: number;
}

// Constrained game-theory action (tool-call args, no reasoning inside)
export interface PersonaDecisionEvent {
  type: "persona-decision";
  personaId: number;
  personaName: string;
  reasoning: string | null;
  content: Record<string, unknown>; // exact tool-call args
  round: number;
}

// Machine-readable payoffs for a completed round
export interface RoundResultEvent {
  type: "round-result";
  round: number;
  payoffs: Record<number, number>; // personaId → payoff value
}

// Human turn — orchestration writes "pending" to signal UI; UI submits "submitted" back
export interface HumanDiscussionPendingEvent {
  type: "human-discussion-pending";
  round: number;
  requestId: string; // unique per request, used to match submitted event
  expiresAt: number; // unix ms
}

export interface HumanDiscussionSubmittedEvent {
  type: "human-discussion-submitted";
  round: number;
  requestId: string;
  content: string;
}

export interface HumanDecisionPendingEvent {
  type: "human-decision-pending";
  round: number;
  requestId: string;
  expiresAt: number;
}

export interface HumanDecisionSubmittedEvent {
  type: "human-decision-submitted";
  round: number;
  requestId: string;
  content: Record<string, unknown>; // same shape as PersonaDecisionEvent.content
}

export type GameTimelineEvent =
  | SystemEvent
  | PersonaDiscussionEvent
  | PersonaDecisionEvent
  | RoundResultEvent
  | HumanDiscussionPendingEvent
  | HumanDiscussionSubmittedEvent
  | HumanDecisionPendingEvent
  | HumanDecisionSubmittedEvent;

// The full timeline is an ordered flat array of events
export type GameTimeline = GameTimelineEvent[];

// Session data passed to distribution views for "this game" overlays
export type GameSessionStats = { events: GameTimeline };

// ── Extra field stored alongside the session ────────────────────────────────

export interface GameSessionParticipant {
  personaId: number; // HUMAN_PLAYER_ID (-1) for human players
  name: string;
  userId?: number; // set for human players to identify them
}

export interface GameSessionExtra {
  gameType: string;
  participants: GameSessionParticipant[];
  personaModels?: Record<number, LLMModelName>; // personaId → assigned model
  discussionRounds?: number; // session-level override; undefined = use game type default
  error?: string; // set on failure, never on success
}
