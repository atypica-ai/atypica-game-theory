import { gameRules } from "../rules";
import { GameType } from "../types";
import { ultimatumGameActionSchema } from "./schema";
import { ultimatumGamePayoff } from "./payoff";

// Two-player sequential bargaining game.
// Tests fairness norms vs game-theoretic predictions.
export const ultimatumGame: GameType<typeof ultimatumGameActionSchema> = {
  name: "ultimatum-game",
  displayName: "Ultimatum Game",
  tagline: "Divide the money — if they accept",
  punchline: "How much is \"fair\" enough for you?",

  rulesPrompt: gameRules["ultimatum-game"],

  minPlayers: 2,
  maxPlayers: 2,

  horizon: { type: "fixed", rounds: 1 },

  actionSchema: ultimatumGameActionSchema,

  payoffFunction: ultimatumGamePayoff,

  sequential: true, // Players act one-by-one
  simultaneousReveal: false,
  discussionRounds: 0,

  humanInput: {
    fields: [
      {
        type: "enum",
        key: "action",
        options: [
          { value: "propose", label: "Propose", hint: "You decide the split", variant: "positive" as const },
          { value: "accept", label: "Accept", hint: "Accept their offer", variant: "positive" as const },
          { value: "reject", label: "Reject", hint: "Both get nothing", variant: "negative" as const },
        ],
      },
      {
        type: "number",
        key: "proposerShare",
        label: "Your Share",
        min: 0,
        max: 100,
        step: 1,
        hint: "How much you keep out of 100 (other player gets the rest).",
      },
    ],
    defaultAction: { action: "propose", proposerShare: 50 },
  },
};
