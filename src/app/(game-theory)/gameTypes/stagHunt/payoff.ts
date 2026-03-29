import { StagHuntAction } from "./schema";

// Free-rider variant: the stag hunt is a public good.
// If it succeeds, EVERYONE gets +25 — including rabbit hunters.
// Rabbit hunters also keep their private +10, making rabbit + success = 35.
// This creates a free-rider incentive: why commit to the hunt when you can
// pocket both rewards by choosing rabbit?
//
// Threshold: stag hunt succeeds only if at least T players choose stag.
// T = ceil(40% of N), e.g. N=4→T=2, N=5→T=2, N=8→T=4, N=10→T=4.
export function stagHuntPayoff(
  actions: Record<number, StagHuntAction>,
): Record<number, number> {
  const ids = Object.keys(actions).map(Number);
  const n = ids.length;
  const threshold = Math.ceil(0.4 * n);

  const stagHunters = ids.filter((id) => actions[id].action === "stag");
  const stagSucceeds = stagHunters.length >= threshold;

  const result: Record<number, number> = {};
  for (const id of ids) {
    if (actions[id].action === "rabbit") {
      // Private reward always, plus public good if hunt succeeded
      result[id] = stagSucceeds ? 35 : 10;
    } else {
      // Stag: only earns from the hunt itself (no private fallback)
      result[id] = stagSucceeds ? 25 : 0;
    }
  }
  return result;
}
