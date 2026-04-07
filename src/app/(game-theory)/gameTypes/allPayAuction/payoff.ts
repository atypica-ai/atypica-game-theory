import { AllPayAuctionAction } from "./schema";

const PRIZE = 100;

// All-pay auction: highest bidder wins the prize, but EVERYONE pays their bid.
// This creates escalation dynamics and sunk cost commitment.
// Net payoff = prize (if win) - bid (always paid)
export function allPayAuctionPayoff(
  actions: Record<number, AllPayAuctionAction>,
): Record<number, number> {
  const playerIds = Object.keys(actions).map(Number);
  const bids = playerIds.map((id) => actions[id].bid);

  const maxBid = Math.max(...bids);
  const winners = playerIds.filter((id) => actions[id].bid === maxBid);

  const payoffs: Record<number, number> = {};

  for (const id of playerIds) {
    const myBid = actions[id].bid;
    const isWinner = winners.includes(id);

    if (isWinner) {
      // Winner(s) get prize divided among tied winners, minus bid cost
      const prizeShare = Math.floor(PRIZE / winners.length);
      payoffs[id] = prizeShare - myBid;
    } else {
      // Losers pay bid with no prize
      payoffs[id] = -myBid;
    }
  }

  return payoffs;
}
