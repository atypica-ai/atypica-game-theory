import { PrisonerDilemmaAction } from "./schema";

// Classic Prisoner's Dilemma payoff matrix (years in prison, so lower = better)
// Both cooperate: each gets -1 (minor sentence)
// Both defect: each gets -2 (moderate sentence)
// One defects, one cooperates: defector gets 0 (goes free), cooperator gets -3 (max sentence)

export function prisonerDilemmaPayoff(
  actions: Record<string, PrisonerDilemmaAction>,
): Record<string, number> {
  const playerIds = Object.keys(actions);
  if (playerIds.length !== 2) {
    throw new Error("Prisoner's Dilemma requires exactly 2 players");
  }

  const [idA, idB] = playerIds;
  const actionA = actions[idA].action;
  const actionB = actions[idB].action;

  if (actionA === "cooperate" && actionB === "cooperate") {
    return { [idA]: -1, [idB]: -1 };
  } else if (actionA === "defect" && actionB === "defect") {
    return { [idA]: -2, [idB]: -2 };
  } else if (actionA === "defect" && actionB === "cooperate") {
    return { [idA]: 0, [idB]: -3 };
  } else {
    // actionA === "cooperate" && actionB === "defect"
    return { [idA]: -3, [idB]: 0 };
  }
}
