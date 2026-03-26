// Runtime-only persona session (not persisted)
export interface GamePersonaSession {
  personaId: number;
  personaName: string;
  playerId: string; // e.g. "player_A", "player_B"
  systemPrompt: string;
}

// A single player's move in a round
export interface PlayerRecord {
  thoughts: string | null; // internal reasoning — never shown to other players
  words: string | null; // speech / pre-action text — visible to others after round ends
  actions: Record<string, unknown>[]; // tool-call inputs; exactly one per round
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
