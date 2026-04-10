import { gameRules } from "../rules";
import { GameType } from "../types";
import { volunteerDilemmaPayoff } from "./payoff";
import { volunteerDilemmaActionSchema } from "./schema";

// Volunteer's Dilemma: models bystander effect, diffusion of responsibility, public goods provision.
// Key mechanism: Lottery rule - when multiple volunteers appear, ONE is randomly selected to pay cost.
// This creates clear winners (free-riders) and losers (selected volunteer).
export const volunteerDilemma: GameType<typeof volunteerDilemmaActionSchema> = {
  name: "volunteer-dilemma",
  displayName: "Volunteer's Dilemma",
  tagline: "Someone must volunteer — but who wants to be the one who pays?",
  punchline: "Someone has to do the dirty work. Will it be you?",

  rulesPrompt: gameRules["volunteer-dilemma"],

  minPlayers: 3,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: volunteerDilemmaActionSchema,

  payoffFunction: volunteerDilemmaPayoff,

  simultaneousReveal: true, // choices are secret until all decide
  discussionRounds: 1,      // one discussion round - can you coordinate? Or will you defect?

  humanInput: {
    fields: [{
      type: "enum",
      key: "action",
      options: [
        { value: "volunteer", label: "Volunteer", hint: "Bear the cost for the group", variant: "positive" },
        { value: "not_volunteer", label: "Free-ride", hint: "Benefit without contributing", variant: "negative" },
      ],
    }],
    defaultAction: { action: "volunteer" },
  },
};
