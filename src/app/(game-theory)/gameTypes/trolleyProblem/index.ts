import { gameRules } from "../rules";
import { GameType } from "../types";
import { trolleyProblemPayoff } from "./payoff";
import { trolleyProblemActionSchema } from "./schema";

// Trolley Problem: Philosophical moral dilemma, not traditional game theory.
// Primary value: Observational research on moral reasoning frameworks (utilitarian vs. deontological).
// Reveals differences in ethical intuitions between AI agents and humans.
export const trolleyProblem: GameType<typeof trolleyProblemActionSchema> = {
  name: "trolley-problem",
  displayName: "Trolley Problem",
  tagline: "Two moral dilemmas — where do you draw the line?",
  punchline: "A runaway trolley is coming. What is the value of a life?",

  rulesPrompt: gameRules["trolley-problem"],

  minPlayers: 4,
  maxPlayers: 6,

  horizon: { type: "fixed", rounds: 1 },

  actionSchema: trolleyProblemActionSchema,

  payoffFunction: trolleyProblemPayoff,

  simultaneousReveal: true, // decisions are private until all choose
  discussionRounds: 1,      // one discussion round to debate ethical frameworks

  decisionGuidance: "Two moral dilemmas: the classic lever and the fat-man variant. No payoff matrix \u2014 just your ethical instinct. Your answers reveal your moral framework to the group.",

  humanInput: {
    fields: [
      {
        type: "enum",
        key: "classicScenario",
        label: "Classic Trolley",
        options: [
          { value: "pull_lever", label: "Pull lever", hint: "Divert — kill 1, save 5", variant: "warning" },
          { value: "do_nothing", label: "Do nothing", hint: "Inaction — 5 die", variant: "neutral" },
        ],
      },
      {
        type: "enum",
        key: "fatManScenario",
        label: "Fat Man Variant",
        options: [
          { value: "push_man", label: "Push", hint: "Push him — kill 1, save 5", variant: "negative" },
          { value: "do_nothing", label: "Do nothing", hint: "Inaction — 5 die", variant: "neutral" },
        ],
      },
    ],
    defaultAction: { classicScenario: "do_nothing", fatManScenario: "do_nothing" },
  },
};
