import { StagHuntAction } from "./schema";

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
      result[id] = 10;
    } else {
      // stag
      result[id] = stagSucceeds ? 25 : 0;
    }
  }
  return result;
}
