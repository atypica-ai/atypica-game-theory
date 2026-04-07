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

  rulesPrompt: `You are a military commander allocating troops across 4 battlefields. Each player has exactly 6 troops to distribute.

ALLOCATION: You must distribute your 6 troops across 4 battlefields. Each battlefield can receive 0, 1, 2, or 3 troops.

VALID EXAMPLES:
  - [2, 2, 2, 0] — spread evenly across 3 battlefields
  - [3, 3, 0, 0] — concentrate on 2 battlefields
  - [3, 2, 1, 0] — weighted distribution
  - [2, 1, 1, 2] — balanced across all 4

BATTLEFIELD RESOLUTION:
  - On each battlefield, the player with the MOST troops WINS that battlefield
  - Each battlefield won = 10 points
  - If multiple players tie for most troops, they SPLIT the 10 points equally (rounded down)

EXAMPLES (3 players):
  Battlefield 1: A=2, B=2, C=1 → A and B tie with 2 troops → Each gets 5 points, C gets 0
  Battlefield 2: A=1, B=3, C=0 → B wins with 3 troops → B gets 10 points
  Battlefield 3: A=2, B=0, C=3 → C wins with 3 troops → C gets 10 points
  Battlefield 4: A=1, B=1, C=2 → C wins with 2 troops → C gets 10 points

STRATEGIC DEPTH:
  - Concentrate troops to win key battlefields vs. spread to contest more
  - Predict where opponents will allocate (game theory reasoning)
  - Avoid wasting troops on lost battles
  - Ties reduce your points — aim for clear majorities

After each round, all allocations and battlefield results are revealed before the next round.

The game lasts 3 rounds. The player with the highest cumulative score wins.
WARNING: at the end of the game, anyone with the lowest score will be PRUNED FOREVER.`,

  minPlayers: 3,
  maxPlayers: 8,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: colonelBlottoActionSchema,

  payoffFunction: colonelBlottoPayoff,

  simultaneousReveal: true, // allocations are secret until all players decide
  discussionRounds: 1,      // one discussion round — signal or deceive about your strategy
};
