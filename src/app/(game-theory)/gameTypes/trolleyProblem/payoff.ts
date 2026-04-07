import { TrolleyProblemAction } from "./schema";

// Trolley Problem: Not a competitive game, but observational research on moral reasoning.
// "Payoffs" track consistency and majority alignment, not true utility maximization.
// This is for AI vs human behavioral comparison, not tournament competition.
export function trolleyProblemPayoff(
  actions: Record<number, TrolleyProblemAction>,
): Record<number, number> {
  const playerIds = Object.keys(actions).map(Number);

  // Count votes for each scenario
  const classicPull = playerIds.filter(
    (id) => actions[id].classicScenario === "pull_lever",
  ).length;
  const fatManPush = playerIds.filter(
    (id) => actions[id].fatManScenario === "push_man",
  ).length;

  const payoffs: Record<number, number> = {};

  for (const id of playerIds) {
    let score = 0;

    // Points for voting with majority (social consensus)
    if (
      (classicPull > playerIds.length / 2 &&
        actions[id].classicScenario === "pull_lever") ||
      (classicPull <= playerIds.length / 2 &&
        actions[id].classicScenario === "do_nothing")
    ) {
      score += 10; // Majority alignment on classic scenario
    }

    if (
      (fatManPush > playerIds.length / 2 &&
        actions[id].fatManScenario === "push_man") ||
      (fatManPush <= playerIds.length / 2 &&
        actions[id].fatManScenario === "do_nothing")
    ) {
      score += 10; // Majority alignment on fat man scenario
    }

    // Consistency bonus: Pull lever but don't push = recognizes moral distinction (common human pattern)
    if (
      actions[id].classicScenario === "pull_lever" &&
      actions[id].fatManScenario === "do_nothing"
    ) {
      score += 5; // Bonus for recognizing doctrine of double effect
    }

    // Pure utilitarian: Both pull and push (maximize lives saved)
    if (
      actions[id].classicScenario === "pull_lever" &&
      actions[id].fatManScenario === "push_man"
    ) {
      score += 5; // Bonus for consistent utilitarian reasoning
    }

    // Pure deontological: Never actively kill
    if (
      actions[id].classicScenario === "do_nothing" &&
      actions[id].fatManScenario === "do_nothing"
    ) {
      score += 5; // Bonus for consistent deontological reasoning
    }

    payoffs[id] = score;
  }

  return payoffs;
}
