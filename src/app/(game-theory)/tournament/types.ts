// Stored in Tournament.state JSON field.
// GameSession is the single source of truth for game progress, timeline, and payoffs.
// Nothing game-session-specific is duplicated here.

export interface TournamentState {
  stages: TournamentStageState[];
}

export interface TournamentStageState {
  stageNumber: number; // 1, 2, or 3
  status: "pending" | "running" | "completed";
  gameSessionTokens: string[]; // one per group; look up GameSession for everything else
  advancingPersonaIds: number[]; // populated when stage.status → "completed"
}

// Stored in Tournament.extra JSON field.
export interface TournamentExtra {
  error?: string; // set on failure
}
