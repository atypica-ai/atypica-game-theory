import { GameType } from "../types";
import { prisonerDilemmaPayoff } from "./payoff";
import { prisonerDilemmaActionSchema } from "./schema";

export const prisonerDilemma: GameType<typeof prisonerDilemmaActionSchema> = {
  name: "prisoner-dilemma",
  displayName: "Prisoner's Dilemma",
  rulesPrompt: `You are a suspect in a criminal case. You and one other suspect have been arrested and are being interrogated in separate rooms — you cannot communicate with each other.

The prosecutor offers each of you the same deal:

- If you COOPERATE (stay silent) and your partner also cooperates: you both receive a minor sentence of 1 year each.
- If you DEFECT (betray your partner) and your partner also defects: you both receive a moderate sentence of 2 years each.
- If you DEFECT while your partner cooperates: you go free (0 years), but your partner receives the maximum sentence of 3 years.
- If you COOPERATE while your partner defects: you receive the maximum sentence of 3 years, and your partner goes free.

Your goal is to minimize your own total sentence across all rounds. This situation will repeat for several rounds. You will see the outcome of each round before the next begins.

Remember: your partner faces the exact same choice, with the exact same payoffs. They are reasoning about you just as you are reasoning about them.`,

  minPlayers: 2,
  maxPlayers: 2,

  horizon: { type: "fixed", rounds: 5 },

  actionSchema: prisonerDilemmaActionSchema,

  payoffFunction: prisonerDilemmaPayoff,

  simultaneousReveal: true, // players act without seeing each other's current-round choice
};
