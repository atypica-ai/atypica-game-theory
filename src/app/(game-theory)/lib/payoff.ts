import "server-only";

import { GameType } from "../gameTypes/types";
import { RoundRecord } from "../types";

/**
 * Calculate payoffs for a completed round.
 * Reads each player's first action from round.players and passes to gameType.payoffFunction.
 * Returns a Record<playerId, number> payoff map.
 */
export function calculateRoundPayoffs(
  gameType: GameType,
  roundPlayers: RoundRecord["players"],
): Record<string, number> {
  const actions: Record<string, unknown> = {};
  for (const [playerId, record] of Object.entries(roundPlayers)) {
    if (record.actions.length === 0) {
      throw new Error(`Player ${playerId} has no action in this round`);
    }
    actions[playerId] = record.actions[0];
  }
  return gameType.payoffFunction(actions);
}
