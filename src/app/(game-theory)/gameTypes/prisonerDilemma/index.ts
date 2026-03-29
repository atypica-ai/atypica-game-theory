import { GameType } from "../types";
import { prisonerDilemmaPayoff } from "./payoff";
import { prisonerDilemmaActionSchema } from "./schema";

// Implements the "easy, 4-round" treatment from Dal Bó & Fréchette (2011).
// Payoff matrix: T(63) > R(51) > P(39) > S(22), K ≈ 0.41 — moderate defection temptation.
// The rules prompt deliberately does NOT state an explicit optimization goal,
// matching the original experiment design so each persona's values drive their behavior.
export const prisonerDilemma: GameType<typeof prisonerDilemmaActionSchema> = {
  name: "prisoner-dilemma",
  displayName: "Prisoner's Dilemma",
  tagline: "Can you trust a stranger you'll never speak to?",
  rulesPrompt: `You are paired with one other person in a decision-making experiment. You are in separate rooms and cannot communicate in any way.

In each round, you and the other person simultaneously and independently choose one of two actions — cooperate or defect — without seeing each other's choice first. Your points for the round depend on the combination of both choices:

  Both cooperate:              you each earn 51 points
  You cooperate, other defects:  you earn 22, they earn 63
  You defect, other cooperates:  you earn 63, they earn 22
  Both defect:                 you each earn 39 points

What you earn depends on both your decision and the other person's decision. After each round, both choices and the resulting points are revealed before the next round begins.

The other person faces exactly the same situation, with exactly the same payoffs, and is making their decision at the same time as you.`,

  minPlayers: 2,
  maxPlayers: 2,

  horizon: { type: "fixed", rounds: 4 },

  actionSchema: prisonerDilemmaActionSchema,

  payoffFunction: prisonerDilemmaPayoff,

  simultaneousReveal: true, // players act without seeing each other's current-round choice
  discussionRounds: 0,      // no discussion — players cannot communicate before deciding
};
