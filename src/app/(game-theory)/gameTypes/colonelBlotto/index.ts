import { gameRules } from "../rules";
import { GameType } from "../types";
import { colonelBlottoPayoff } from "./payoff";
import { colonelBlottoActionSchema } from "./schema";

// Colonel Blotto Game (simplified multiplayer): models resource allocation under competition.
// Key insight: Concentration vs. spread tradeoffs, predicting opponents' strategies.
// Classic applications: political campaigns, military strategy, R&D investment.
export const colonelBlotto: GameType<typeof colonelBlottoActionSchema> = {
  name: "colonel-blotto",
  displayName: "Colonel Blotto",
  tagline: "Allocate your troops wisely — concentrate or spread?",

  rulesPrompt: gameRules["colonel-blotto"],

  minPlayers: 3,
  maxPlayers: 8,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: colonelBlottoActionSchema,

  payoffFunction: colonelBlottoPayoff,

  simultaneousReveal: true, // allocations are secret until all players decide
  discussionRounds: 1,      // one discussion round — signal or deceive about your strategy

  humanInput: {
    fields: [
      { type: "number", key: "battlefield1", label: "BF 1", min: 0, max: 3, step: 1 },
      { type: "number", key: "battlefield2", label: "BF 2", min: 0, max: 3, step: 1 },
      { type: "number", key: "battlefield3", label: "BF 3", min: 0, max: 3, step: 1 },
      { type: "number", key: "battlefield4", label: "BF 4", min: 0, max: 3, step: 1 },
    ],
    defaultAction: { battlefield1: 2, battlefield2: 2, battlefield3: 1, battlefield4: 1 },
    validate: (values) => {
      const sum = (values.battlefield1 as number ?? 0) + (values.battlefield2 as number ?? 0)
        + (values.battlefield3 as number ?? 0) + (values.battlefield4 as number ?? 0);
      return sum !== 6 ? `Total troops must be 6 (currently ${sum})` : null;
    },
  },
};
