import { PrisonerDilemmaAction } from "./schema";

// Payoff matrix from Dal Bó & Fréchette (2011) "easy" treatment:
//   (C,C) = 51, 51  — mutual cooperation
//   (C,D) = 22, 63  — sucker / temptation
//   (D,C) = 63, 22  — temptation / sucker
//   (D,D) = 39, 39  — mutual defection
// Satisfies PD conditions: T(63) > R(51) > P(39) > S(22), and 2R(102) > T+S(85)
// K = (T-R)/(R-S) = 12/29 ≈ 0.41 — moderate temptation, cooperation is strategically meaningful

export function prisonerDilemmaPayoff(
  actions: Record<number, PrisonerDilemmaAction>,
): Record<number, number> {
  const ids = Object.keys(actions).map(Number);
  if (ids.length !== 2) {
    throw new Error("Prisoner's Dilemma requires exactly 2 players");
  }

  const [idA, idB] = ids;
  const actionA = actions[idA].action;
  const actionB = actions[idB].action;

  if (actionA === "cooperate" && actionB === "cooperate") {
    return { [idA]: 51, [idB]: 51 };
  } else if (actionA === "cooperate" && actionB === "defect") {
    return { [idA]: 22, [idB]: 63 };
  } else if (actionA === "defect" && actionB === "cooperate") {
    return { [idA]: 63, [idB]: 22 };
  } else {
    // both defect
    return { [idA]: 39, [idB]: 39 };
  }
}
