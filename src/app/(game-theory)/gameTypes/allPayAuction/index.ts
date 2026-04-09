import { GameType } from "../types";
import { allPayAuctionPayoff } from "./payoff";
import { allPayAuctionActionSchema } from "./schema";

// All-Pay Auction: models escalation commitment, sunk cost fallacy, and wasteful competition.
// Key insight: even losers must pay their bids → creates escalation trap.
// Real-world analogues: arms races, rent-seeking, lobbying, R&D competition.
export const allPayAuction: GameType<typeof allPayAuctionActionSchema> = {
  name: "all-pay-auction",
  displayName: "All-Pay Auction",
  tagline: "The winner takes the prize — but everyone pays their bid.",

  rulesPrompt: `You are participating in an All-Pay Auction with several other players. Each round, every player secretly and simultaneously submits a bid from 0 to 150.

The prize is worth 100 points.

CRITICAL RULE: The highest bidder wins the prize, BUT every player must pay their bid — winners AND losers.

Payoffs:
  - Highest bidder: wins 100 points, pays their bid → net = 100 - bid
  - All other bidders: win 0 points, still pay their bid → net = -bid
  - If multiple players tie for highest bid, they split the 100-point prize equally (rounded down), but each still pays their full bid.

Examples (4 players):
  - Bids: 40, 60, 30, 20 → Player with 60 wins: 100 - 60 = +40. Others: -40, -30, -20
  - Bids: 50, 50, 30, 20 → Two tie at 50: each gets 50 points, pays 50 → net 0 each. Others: -30, -20

After each round, all bids and resulting payoffs are revealed before the next round.

The game lasts 3 rounds. The player with the highest cumulative score wins.
WARNING: at the end of the game, anyone with the lowest score will be PRUNED FOREVER.
`,

  minPlayers: 4,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: allPayAuctionActionSchema,

  payoffFunction: allPayAuctionPayoff,

  simultaneousReveal: true, // bids are secret until all players submit
  discussionRounds: 1,      // one discussion round before each bid - psychological warfare

  humanInput: {
    fields: [{
      type: "number",
      key: "bid",
      label: "Your Bid",
      min: 0,
      max: 150,
      step: 1,
      hint: "Prize is 100 pts. Everyone pays their bid — even losers.",
    }],
    defaultAction: { bid: 0 },
  },
};
