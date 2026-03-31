import { GameType } from "../types";
import { beautyContestPayoff } from "./payoff";
import { beautyContestActionSchema } from "./schema";

export const beautyContest: GameType<typeof beautyContestActionSchema> = {
  name: "beauty-contest",
  displayName: "Beauty Contest",
  tagline: "Don't pick what you think is best — pick what you think others think is best.",

  rulesPrompt: `You are participating in a Beauty Contest game with several other players. Each round, every player secretly and simultaneously picks an integer from 0 to 100.

The winner is the player whose number is closest to ⅔ of the group average.

For example: if 4 players pick 20, 40, 60, 80 — the average is 50, the target is ⅔ × 50 ≈ 33.3. The player who picked 40 is closest and wins.

Scoring:
  - The winner(s) share a pot of 50 points equally (rounded down per winner).
  - All other players earn 0 points this round.
  - If two or more players are equally close to the target, they split the pot.

After each round, all numbers, the group average, and the target value are revealed before the next round.

The game lasts 3 rounds. The player with the highest cumulative score wins.
WARNING: at the end of the game, anyone with the lowest score will be PRUNED FOREVER.`,

  minPlayers: 4,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: beautyContestActionSchema,

  payoffFunction: beautyContestPayoff,

  simultaneousReveal: true,
  discussionRounds: 1,
};
