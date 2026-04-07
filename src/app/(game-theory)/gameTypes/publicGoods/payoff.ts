import { PublicGoodsAction } from "./schema";

const ENDOWMENT = 20; // Starting tokens for each player
const MULTIPLIER = 1.6; // Public pool multiplier

// Public Goods Game: Players contribute to a public pool.
// Pool is multiplied and redistributed equally to all players.
// Free-riders (contribute 0) benefit from others' contributions without paying cost.
// Nash equilibrium: contribute 0 (defection dominant).
// Social optimum: everyone contributes everything (ENDOWMENT × MULTIPLIER / N > ENDOWMENT when MULTIPLIER > 1).
export function publicGoodsPayoff(
  actions: Record<number, PublicGoodsAction>,
): Record<number, number> {
  const playerIds = Object.keys(actions).map(Number);
  const n = playerIds.length;

  // Calculate total contributions
  const totalContributions = playerIds.reduce(
    (sum, id) => sum + actions[id].contribution,
    0,
  );

  // Public pool after multiplier
  const publicPool = totalContributions * MULTIPLIER;

  // Each player gets equal share of public pool
  const publicShare = Math.floor(publicPool / n);

  const payoffs: Record<number, number> = {};

  for (const id of playerIds) {
    const myContribution = actions[id].contribution;
    const privateKeep = ENDOWMENT - myContribution;

    // Payoff = what you kept + your share of public pool
    payoffs[id] = privateKeep + publicShare;
  }

  return payoffs;
}
