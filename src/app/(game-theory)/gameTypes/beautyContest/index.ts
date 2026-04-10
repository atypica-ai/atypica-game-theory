import { gameRules } from "../rules";
import { GameType } from "../types";
import { beautyContestPayoff } from "./payoff";
import { beautyContestActionSchema } from "./schema";

export const beautyContest: GameType<typeof beautyContestActionSchema> = {
  name: "beauty-contest",
  displayName: "Beauty Contest",
  tagline: "Don't pick what you think is best — pick what you think others think is best.",
  punchline: "It's not about what you like — it's about what you think everyone else thinks.",

  rulesPrompt: gameRules["beauty-contest"],

  minPlayers: 4,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: beautyContestActionSchema,

  payoffFunction: beautyContestPayoff,

  simultaneousReveal: true,
  discussionRounds: 1,

  decisionGuidance: "Pick a number 0\u2013100. The winner is closest to \u2154 of the group\u2019s average. Think about what others will guess \u2014 then think one level deeper.",

  humanInput: {
    fields: [{
      type: "number",
      key: "number",
      label: "Your Number",
      min: 0,
      max: 100,
      step: 1,
      hint: "Closest to ⅔ of the group average wins.",
    }],
    defaultAction: { number: 50 },
  },
};
