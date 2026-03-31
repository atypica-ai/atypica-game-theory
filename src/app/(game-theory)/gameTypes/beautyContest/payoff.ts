import { BeautyContestAction } from "./schema";

const POT = 50;

export function beautyContestPayoff(
  actions: Record<number, BeautyContestAction>,
): Record<number, number> {
  const playerIds = Object.keys(actions).map(Number);
  const numbers = playerIds.map((id) => actions[id].number);

  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  const target = (2 / 3) * mean;

  const distances = playerIds.map((id) => Math.abs(actions[id].number - target));
  const minDist = Math.min(...distances);

  const winners = playerIds.filter((id) => Math.abs(actions[id].number - target) === minDist);
  const winnerShare = Math.floor(POT / winners.length);

  const payoffs: Record<number, number> = {};
  for (const id of playerIds) {
    payoffs[id] = winners.includes(id) ? winnerShare : 0;
  }

  return payoffs;
}
