import { gameRules } from "../rules";
import { GameType } from "../types";
import { publicGoodsPayoff } from "./payoff";
import { publicGoodsActionSchema } from "./schema";

// Public Goods Game: models tragedy of commons, free-rider problem, climate change cooperation.
// Key insight: Individual rationality (contribute 0) vs. collective rationality (all contribute).
// Free-riders win by contributing nothing while benefiting from others' contributions.
export const publicGoods: GameType<typeof publicGoodsActionSchema> = {
  name: "public-goods",
  displayName: "Public Goods Game",
  tagline: "Contribute to the common good — or free-ride and let others pay?",
  punchline: "Will you contribute to the community or be a free rider?",

  rulesPrompt: gameRules["public-goods"],

  minPlayers: 4,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: publicGoodsActionSchema,

  payoffFunction: publicGoodsPayoff,

  simultaneousReveal: true, // contributions are secret until all players decide
  discussionRounds: 1,      // one discussion round before each contribution - can you build trust?

  decisionGuidance: "Contribute to the shared pool \u2014 it gets multiplied 1.6\u00d7 and split equally. Contributing nothing lets you free-ride. But if everyone free-rides, the pool stays empty.",

  humanInput: {
    fields: [{
      type: "number",
      key: "contribution",
      label: "Contribution",
      min: 0,
      max: 20,
      step: 1,
      hint: "Pool is multiplied 1.6× and split equally. You keep the rest.",
    }],
    defaultAction: { contribution: 10 },
  },
};
