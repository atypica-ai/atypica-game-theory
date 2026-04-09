import { GameType } from "../types";
import { ultimatumGameActionSchema } from "./schema";
import { ultimatumGamePayoff } from "./payoff";

// Two-player sequential bargaining game.
// Tests fairness norms vs game-theoretic predictions.
export const ultimatumGame: GameType<typeof ultimatumGameActionSchema> = {
  name: "ultimatum-game",
  displayName: "Ultimatum Game",
  tagline: "Divide the money — if they accept",

  rulesPrompt: `Two players divide 100 points sequentially.

If you act FIRST: You are the PROPOSER. Choose how to split 100 points (e.g., 70 for you, 30 for them).

If you act SECOND: You are the RESPONDER. You see the proposal and must accept or reject it.
  - ACCEPT: Both get the proposed split
  - REJECT: Both get 0 points

Game theory predicts: Proposer offers 99-1, Responder accepts anything > 0.
Reality: Humans offer 40-50%, reject offers < 30% (fairness norms).

This is a ONE-ROUND game. Make your choice carefully.`,

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
