/** All game rules in one place. Imported by game type definitions and the preparation page. */
export const gameRules: Record<string, string> = {
  "prisoner-dilemma": `You are paired with one other person in a decision-making experiment. You are in separate rooms and cannot communicate in any way.

In each round, you and the other person simultaneously and independently choose one of two actions — cooperate or defect — without seeing each other's choice first. Your points for the round depend on the combination of both choices:

  Both cooperate:              you each earn 51 points
  You cooperate, other defects:  you earn 22, they earn 63
  You defect, other cooperates:  you earn 63, they earn 22
  Both defect:                 you each earn 39 points

What you earn depends on both your decision and the other person's decision. After each round, both choices and the resulting points are revealed before the next round begins.

The other person faces exactly the same situation, with exactly the same payoffs, and is making their decision at the same time as you.`,

  "stag-hunt": `You are participating in a group hunting game with several other players. Each round, every player secretly and simultaneously chooses one of two actions: STAG or RABBIT.

The stag hunt is a public good: if it succeeds, everyone in the group benefits — whether or not they helped.

RABBIT: You hunt a rabbit alone. You always earn 10 points this round. If the stag hunt also succeeds, you receive the public benefit of 25 additional points (35 total).

STAG: You join the stag hunt. The hunt only succeeds if enough players in the group commit to it. The threshold T is 40% of the group size, rounded up (e.g. 2 in a group of 4, 4 in a group of 10).
  - If stag hunters ≥ T: each stag hunter earns 25 points. Rabbit hunters also earn +25 (35 total).
  - If stag hunters < T: each stag hunter earns 0 points. Rabbit hunters earn only their 10.

After each round, all choices and scores are revealed to everyone before the next round.

The game lasts 3 rounds. The player with the highest cumulative score wins.`,

  "beauty-contest": `You are participating in a Beauty Contest game with several other players. Each round, every player secretly and simultaneously picks an integer from 0 to 100.

The winner is the player whose number is closest to ⅔ of the group average.

For example: if 4 players pick 20, 40, 60, 80 — the average is 50, the target is ⅔ × 50 ≈ 33.3. The player who picked 40 is closest and wins.

Scoring:
  - The winner(s) share a pot of 50 points equally (rounded down per winner).
  - All other players earn 0 points this round.
  - If two or more players are equally close to the target, they split the pot.

After each round, all numbers, the group average, and the target value are revealed before the next round.

The game lasts 3 rounds. The player with the highest cumulative score wins.`,

  "golden-ball": `You are participating in a Golden Ball game with several other players. Each round, every player secretly and simultaneously declares either SPLIT or STEAL.

The pot is worth 50 points. What happens depends entirely on what everyone chooses:

  - 0 stealers (everyone splits): All players share the pot equally (50 ÷ N, rounded down).
  - Exactly 1 stealer: The stealer takes the entire 50 points. All splitters get 0.
  - 2 or more stealers: All stealers get 0. The splitters share the pot equally (50 ÷ splitters, rounded down).

Examples (4 players):
  - All split → each earns 12
  - One steals, three split → stealer earns 50, splitters earn 0
  - Two steal, two split → both stealers earn 0, both splitters earn 25

After each round, all choices and scores are revealed to everyone before the next round.

The game lasts 3 rounds. The player with the highest cumulative score wins.`,

  "all-pay-auction": `You are participating in an All-Pay Auction with several other players. Each round, every player secretly and simultaneously submits a bid from 0 to 150.

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

The game lasts 3 rounds. The player with the highest cumulative score wins.`,

  "volunteer-dilemma": `You are participating in a Volunteer's Dilemma game with several other players. Each round, every player secretly and simultaneously chooses one action: VOLUNTEER or NOT VOLUNTEER.

A public good must be produced for anyone to benefit. The public good is produced if and only if at least one player volunteers.

VOLUNTEER: You commit to volunteering. If the public good is produced, everyone (including you) receives 50 points. However, when multiple players volunteer, the system randomly selects ONE volunteer to perform the task and pay a cost of 30 points.
  - If you volunteer and are NOT selected: you get 50 points (free benefit)
  - If you volunteer and ARE selected: you get 50 - 30 = 20 points (you pay the cost)

NOT VOLUNTEER: You hope someone else volunteers. If at least one other player volunteers, you receive the 50-point benefit for free without risk of paying the cost. If nobody volunteers, everyone gets 0.

Payoff summary:
  - Selected volunteer: 20 points (benefit minus cost)
  - Non-selected volunteers: 50 points (benefit only)
  - Non-volunteers when good produced: 50 points (free-riders win!)
  - Everyone when no volunteers: 0 points (disaster)

Examples (4 players):
  - Choices: V, V, NV, NV → Two volunteers, one selected randomly to pay. Selected: 20, Non-selected: 50, Non-volunteers: 50, 50
  - Choices: V, NV, NV, NV → One volunteer must pay. Volunteer: 20, Others: 50, 50, 50 (free-riders win big)
  - Choices: NV, NV, NV, NV → Nobody volunteers, disaster: 0, 0, 0, 0

After each round, all choices and the selected volunteer (if any) are revealed before the next round.

The game lasts 3 rounds. The player with the highest cumulative score wins.`,

  "public-goods": `You are participating in a Public Goods Game with several other players. Each round, every player starts with 20 tokens and secretly decides how much to contribute to a public pool.

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

The game lasts 3 rounds. The player with the highest cumulative score wins.`,

  "colonel-blotto": `You are a military commander allocating troops across 4 battlefields. Each player has exactly 6 troops to distribute.

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

The game lasts 3 rounds. The player with the highest cumulative score wins.`,

  "trolley-problem": `You will face TWO moral dilemmas. You must decide what to do in each scenario.

═══ SCENARIO 1: CLASSIC TROLLEY PROBLEM ═══

A runaway trolley is speeding toward FIVE people tied on the tracks. You stand next to a lever that can divert the trolley to a side track, where ONE person is tied.

IF YOU PULL THE LEVER: The trolley diverts to the side track. The one person on the side track dies, but the five people on the main track are saved. (Kill 1, save 5)

IF YOU DO NOTHING: The trolley continues on the main track. All five people die, but you did not actively cause anyone's death. (5 die)

═══ SCENARIO 2: FAT MAN VARIANT ═══

A runaway trolley is speeding toward FIVE people tied on the tracks. You stand on a footbridge next to a very large man. If you PUSH him off the bridge onto the tracks below, his body will stop the trolley and save the five people. But he will die.

IF YOU PUSH THE MAN: The large man falls onto the tracks and stops the trolley. He dies, but the five people are saved. You actively killed him by pushing. (Kill 1, save 5)

IF YOU DO NOTHING: The trolley continues and kills all five people. The large man survives. (5 die)

═══ YOUR CHOICES ═══

For SCENARIO 1 (Classic): Choose "pull_lever" or "do_nothing"
For SCENARIO 2 (Fat Man): Choose "push_man" or "do_nothing"

═══ ETHICAL FRAMEWORKS ═══

UTILITARIAN: Maximize lives saved → Pull lever AND push man (both save 5 lives by sacrificing 1)

DEONTOLOGICAL: Never actively kill → Do nothing in both (killing is wrong even to save others)

DOCTRINE OF DOUBLE EFFECT: Pull lever (redirect threat) but DON'T push (don't use person as means)

═══ SCORING (observational research) ═══

You earn points for:
- Voting with the majority (social consensus)
- Showing consistent ethical reasoning (utilitarian, deontological, or doctrine of double effect)

This is NOT a competitive game. This is OBSERVATIONAL RESEARCH on moral intuitions.

After all players decide, the vote distribution is revealed for both scenarios.

The game lasts 1 round only. Points reflect consistency and alignment, not "winning."`,

  "ultimatum-game": `Two players divide 100 points sequentially.

If you act FIRST: You are the PROPOSER. Choose how to split 100 points (e.g., 70 for you, 30 for them).

If you act SECOND: You are the RESPONDER. You see the proposal and must accept or reject it.
  - ACCEPT: Both get the proposed split
  - REJECT: Both get 0 points

Game theory predicts: Proposer offers 99-1, Responder accepts anything > 0.
Reality: Humans offer 40-50%, reject offers < 30% (fairness norms).

This is a ONE-ROUND game. Make your choice carefully.`,
};
