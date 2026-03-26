// Runtime-only persona session (not persisted)
export interface GamePersonaSession {
  personaId: number;
  personaName: string;
  playerId: string; // e.g. "player_A", "player_B"
  systemPrompt: string;
}

// A single player's move in a round
export interface PlayerRecord {
  // Private reasoning — never shown to other players.
  // Auto-populated when the action schema contains a "reasoning" field (which should be placed first).
  reasoning: string | null;
  // Public speech before the action — visible to other players after the round ends.
  // Null for games where players cannot communicate (e.g. Prisoner's Dilemma).
  words: string | null;
  // Tool-call inputs with the "reasoning" field stripped out — exactly one per round.
  actions: Record<string, unknown>[];
}

// A complete round
export interface RoundRecord {
  roundId: number;
  system: string; // round-wise announcement visible to all
  players: Record<string, PlayerRecord>; // keyed by playerId
  payoffs: Record<string, number>; // keyed by playerId; populated after all players act
}

// Game-level metadata
export interface GameSessionMeta {
  gameType: string;
  participants: Array<{
    personaId: number;
    name: string;
    playerId: string;
  }>;
}

// Full game timeline — stored as JSON in GameSession.timeline
export interface GameSessionTimeline {
  meta: GameSessionMeta;
  system: string; // game-wise rules announcement
  rounds: RoundRecord[];
}
