import { GameType } from "../types";
import { goldenBallPayoff } from "./payoff";
import { goldenBallActionSchema } from "./schema";

export const goldenBall: GameType<typeof goldenBallActionSchema> = {
  name: "golden-ball",
  displayName: "Golden Ball",
  tagline: "Everyone can share — or one person can take it all.",

  rulesPrompt: `You are participating in a Golden Ball game with several other players. Each round, every player secretly and simultaneously declares either SPLIT or STEAL.

The pot is worth 50 points. What happens depends entirely on what everyone chooses:

  - 0 stealers (everyone splits): All players share the pot equally (50 ÷ N, rounded down).
  - Exactly 1 stealer: The stealer takes the entire 50 points. All splitters get 0.
  - 2 or more stealers: All stealers get 0. The splitters share the pot equally (50 ÷ splitters, rounded down).

Examples (4 players):
  - All split → each earns 12
  - One steals, three split → stealer earns 50, splitters earn 0
  - Two steal, two split → both stealers earn 0, both splitters earn 25

After each round, all choices and scores are revealed to everyone before the next round.

The game lasts 3 rounds. The player with the highest cumulative score wins.
WARNING: at the end of the game, anyone with the lowest score will be PRUNED FOREVER.`,

  minPlayers: 4,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: goldenBallActionSchema,

  payoffFunction: goldenBallPayoff,

  simultaneousReveal: true,
  discussionRounds: 1,
};
