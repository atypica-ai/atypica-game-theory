import { ColonelBlottoAction } from "./schema";

const BATTLEFIELDS = 4;
const POINTS_PER_BATTLEFIELD = 10;

// Colonel Blotto Game: Players allocate troops across battlefields.
// Player with most troops on a battlefield wins it.
// Ties: battlefield points split among tied players.
// Winner: player who wins most battlefields (or most total points from battlefields).
export function colonelBlottoPayoff(
  actions: Record<number, ColonelBlottoAction>,
): Record<number, number> {
  const playerIds = Object.keys(actions).map(Number);

  // Initialize payoffs
  const payoffs: Record<number, number> = {};
  for (const id of playerIds) {
    payoffs[id] = 0;
  }

  // Process each battlefield
  for (let bf = 1; bf <= BATTLEFIELDS; bf++) {
    const bfKey = `battlefield${bf}` as keyof ColonelBlottoAction;

    // Get all players' troops on this battlefield
    const troops = playerIds.map((id) => ({
      playerId: id,
      troops: actions[id][bfKey],
    }));

    // Find max troops
    const maxTroops = Math.max(...troops.map((t) => t.troops));

    // Winners are players with max troops
    const winners = troops.filter((t) => t.troops === maxTroops);

    // Split battlefield points among winners
    const pointsPerWinner = Math.floor(POINTS_PER_BATTLEFIELD / winners.length);

    for (const winner of winners) {
      payoffs[winner.playerId] += pointsPerWinner;
    }
  }

  return payoffs;
}
