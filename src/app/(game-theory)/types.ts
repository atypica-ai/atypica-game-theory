// Runtime-only persona session (not persisted)
export interface GamePersonaSession {
  personaId: number;
  personaName: string;
  systemPrompt: string;
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

export type GameTimelineEvent =
  | SystemEvent
  | PersonaDiscussionEvent
  | PersonaDecisionEvent
  | RoundResultEvent;

// The full timeline is an ordered flat array of events
export type GameTimeline = GameTimelineEvent[];

// ── Extra field stored alongside the session ────────────────────────────────

export interface GameSessionParticipant {
  personaId: number;
  name: string;
}

export interface GameSessionExtra {
  gameType: string;
  participants: GameSessionParticipant[];
  error?: string; // set on failure, never on success
}
