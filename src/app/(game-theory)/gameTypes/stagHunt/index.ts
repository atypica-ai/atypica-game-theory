import { gameRules } from "../rules";
import { GameType } from "../types";
import { stagHuntPayoff } from "./payoff";
import { stagHuntActionSchema } from "./schema";

// 猎鹿 (Stag Hunt) — Free-Rider Variant
// The stag hunt is a public good: if it succeeds, EVERYONE benefits (stag or rabbit).
// Rabbit hunters collect their private 10 AND the public 25, making rabbit the dominant
// free-rider strategy — unless enough others defect and the hunt collapses.
export const stagHunt: GameType<typeof stagHuntActionSchema> = {
  name: "stag-hunt",
  displayName: "Stag Hunt",
  tagline: "Why risk the hunt when you can pocket both rewards for free?",

  rulesPrompt: gameRules["stag-hunt"],

  minPlayers: 4,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: stagHuntActionSchema,

  payoffFunction: stagHuntPayoff,

  simultaneousReveal: true, // players choose secretly — reveal only after all have decided
  discussionRounds: 1,      // one discussion round (all players speak once) before each decision

  humanInput: {
    fields: [{
      type: "enum",
      key: "action",
      options: [
        { value: "stag", label: "Stag", hint: "High reward — requires enough hunters", variant: "positive" },
        { value: "rabbit", label: "Rabbit", hint: "Safe fallback — lower but guaranteed", variant: "warning" },
      ],
    }],
    defaultAction: { action: "stag" },
  },
};
