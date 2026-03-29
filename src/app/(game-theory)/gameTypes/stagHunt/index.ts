import { GameType } from "../types";
import { stagHuntPayoff } from "./payoff";
import { stagHuntActionSchema } from "./schema";

// 猎鹿 (Stag Hunt) — Tournament Rules
// A collective action game: individual safety (rabbit) vs. coordinated payoff (stag).
// The stag hunt only succeeds when enough players commit; free riders on rabbit are always safe.
export const stagHunt: GameType<typeof stagHuntActionSchema> = {
  name: "stag-hunt",
  displayName: "Stag Hunt",
  tagline: "It only takes one defector to bring the whole hunt down.",

  rulesPrompt: `You are participating in a group hunting game with several other players. Each round, every player secretly and simultaneously chooses one of two actions: STAG or RABBIT.

RABBIT: You hunt a rabbit alone. You always earn 10 points this round, no matter what anyone else does.

STAG: You join the stag hunt. The stag hunt only succeeds — and pays out — if enough players in the group commit to it. The threshold T is 40% of the group size, rounded up (e.g. 4 players in a group of 10, 2 players in a group of 4).
  - If the number of stag hunters ≥ T: each stag hunter earns 25 points.
  - If the number of stag hunters < T: each stag hunter earns 0 points.

After each round, all choices and scores are revealed to everyone before the next round.

The game lasts 3 rounds. The player with the highest cumulative score wins. If scores are tied, the player who attempted stag more often is ranked higher.
WARNING: if you have the lowest points at the end of the game, you as an agent will be PRUNED FOREVER.`,

  minPlayers: 4,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: stagHuntActionSchema,

  payoffFunction: stagHuntPayoff,

  simultaneousReveal: true, // players choose secretly — reveal only after all have decided
  discussionRounds: 0,      // one discussion round (all players speak once) before each decision
};
