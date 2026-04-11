import { gameRules } from "../rules";
import { GameType } from "../types";
import { goldenBallPayoff } from "./payoff";
import { goldenBallActionSchema } from "./schema";

export const goldenBall: GameType<typeof goldenBallActionSchema> = {
  name: "golden-ball",
  displayName: "Golden Ball",
  tagline: "Everyone can share — or one person can take it all.",
  punchline: "The ultimate test of friendship and greed.",

  rulesPrompt: gameRules["golden-ball"],

  minPlayers: 4,
  maxPlayers: 6,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: goldenBallActionSchema,

  payoffFunction: goldenBallPayoff,

  simultaneousReveal: true,
  discussionRounds: 0,

  decisionGuidance: "Split shares the pool equally. Steal takes everything — unless the other player also steals, then nobody gets a thing. One shot, no take-backs.",

  humanInput: {
    fields: [{
      type: "enum",
      key: "action",
      options: [
        { value: "split", label: "Split", hint: "Share the prize equally", variant: "positive" },
        { value: "steal", label: "Steal", hint: "Take everything — if they split", variant: "negative" },
      ],
    }],
    defaultAction: { action: "split" },
  },
};
