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

  rulesPrompt: `You are participating in a Public Goods Game with several other players. Each round, every player starts with 20 tokens and secretly decides how much to contribute to a public pool.

ENDOWMENT: You start with 20 tokens this round.

CONTRIBUTION: You choose how much to contribute to the public pool (0 to 20 tokens). You keep the rest.

PUBLIC POOL: All contributions are summed, then multiplied by 1.6×, and split equally among ALL players (including those who contributed nothing).

PAYOFFS:
  Your payoff = (20 - your contribution) + (total pool × 1.6 / N)

EXAMPLES (4 players):
  - Everyone contributes 20: Pool = 80 × 1.6 = 128 → Each gets 0 + 32 = 32 (everyone wins together!)
  - Three contribute 20, one contributes 0: Pool = 60 × 1.6 = 96 → Each gets 24
    - Contributors: (20-20) + 24 = 24
    - Free-rider: (20-0) + 24 = 44 (free-rider wins big!)
  - Everyone contributes 0: Pool = 0 → Everyone keeps 20 (mutual defection)

STRATEGIC DILEMMA:
  - Social optimum: Everyone contributes everything (maximizes total welfare)
  - Individual optimum: Contribute 0 and free-ride on others (Nash equilibrium)
  - Free-riders always do better than contributors in the same round

After each round, all contributions and payoffs are revealed before the next round.

The game lasts 3 rounds. The player with the highest cumulative score wins.
WARNING: at the end of the game, anyone with the lowest score will be PRUNED FOREVER.`,

  minPlayers: 4,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: publicGoodsActionSchema,

  payoffFunction: publicGoodsPayoff,

  simultaneousReveal: true, // contributions are secret until all players decide
  discussionRounds: 1,      // one discussion round before each contribution - can you build trust?

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
