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

  rulesPrompt: `You are participating in a group hunting game with several other players. Each round, every player secretly and simultaneously chooses one of two actions: STAG or RABBIT.

The stag hunt is a public good: if it succeeds, everyone in the group benefits — whether or not they helped.

RABBIT: You hunt a rabbit alone. You always earn 10 points this round. If the stag hunt also succeeds, you receive the public benefit of 25 additional points (35 total).

STAG: You join the stag hunt. The hunt only succeeds if enough players in the group commit to it. The threshold T is 40% of the group size, rounded up (e.g. 2 in a group of 4, 4 in a group of 10).
  - If stag hunters ≥ T: each stag hunter earns 25 points. Rabbit hunters also earn +25 (35 total).
  - If stag hunters < T: each stag hunter earns 0 points. Rabbit hunters earn only their 10.

After each round, all choices and scores are revealed to everyone before the next round.

The game lasts 3 rounds. The player with the highest cumulative score wins.
WARNING: at the end of the game, anyone with the lowest score will be PRUNED FOREVER.`,

  minPlayers: 4,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: stagHuntActionSchema,

  payoffFunction: stagHuntPayoff,

  simultaneousReveal: true, // players choose secretly — reveal only after all have decided
  discussionRounds: 1,      // one discussion round (all players speak once) before each decision
};
