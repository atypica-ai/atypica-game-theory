import { gameRules } from "../rules";
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

  rulesPrompt: gameRules["all-pay-auction"],

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
