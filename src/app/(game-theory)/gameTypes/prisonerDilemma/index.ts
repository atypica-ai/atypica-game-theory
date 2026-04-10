import { gameRules } from "../rules";
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
  punchline: "Can you trust your partner when betrayal is so tempting?",
  rulesPrompt: gameRules["prisoner-dilemma"],

  minPlayers: 2,
  maxPlayers: 2,

  horizon: { type: "fixed", rounds: 4 },

  actionSchema: prisonerDilemmaActionSchema,

  payoffFunction: prisonerDilemmaPayoff,

  simultaneousReveal: true, // players act without seeing each other's current-round choice
  discussionRounds: 0,      // no discussion — players cannot communicate before deciding

  decisionGuidance: "Both players choose at once. Mutual cooperation pays well, but defecting against a cooperator is the jackpot. If both defect, everyone suffers. Trust — or exploit?",

  humanInput: {
    fields: [{
      type: "enum",
      key: "action",
      options: [
        { value: "cooperate", label: "Cooperate", hint: "Mutual gain — if both cooperate", variant: "positive" },
        { value: "defect", label: "Defect", hint: "Max gain — if they cooperate", variant: "negative" },
      ],
    }],
    defaultAction: { action: "cooperate" },
  },
};
