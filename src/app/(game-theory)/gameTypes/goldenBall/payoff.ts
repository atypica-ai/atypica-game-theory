import { GoldenBallAction } from "./schema";

const POT = 50;

export function goldenBallPayoff(
  actions: Record<number, GoldenBallAction>,
): Record<number, number> {
  const playerIds = Object.keys(actions).map(Number);

  const stealers = playerIds.filter((id) => actions[id].action === "steal");
  const splitters = playerIds.filter((id) => actions[id].action === "split");

  const payoffs: Record<number, number> = {};

  if (stealers.length === 0) {
    // All split — share the pot equally
    const share = Math.floor(POT / playerIds.length);
    for (const id of playerIds) {
      payoffs[id] = share;
    }
  } else if (stealers.length === 1) {
    // Exactly one stealer takes everything
    for (const id of playerIds) {
      payoffs[id] = stealers.includes(id) ? POT : 0;
    }
  } else {
    // 2+ stealers — stealers get 0, splitters share the pot equally
    const splitterShare = splitters.length > 0 ? Math.floor(POT / splitters.length) : 0;
    for (const id of playerIds) {
      payoffs[id] = splitters.includes(id) ? splitterShare : 0;
    }
  }

  return payoffs;
}
