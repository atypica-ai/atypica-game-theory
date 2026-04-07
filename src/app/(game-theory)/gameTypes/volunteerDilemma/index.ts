import { GameType } from "../types";
import { volunteerDilemmaPayoff } from "./payoff";
import { volunteerDilemmaActionSchema } from "./schema";

// Volunteer's Dilemma: models bystander effect, diffusion of responsibility, public goods provision.
// Key mechanism: Lottery rule - when multiple volunteers appear, ONE is randomly selected to pay cost.
// This creates clear winners (free-riders) and losers (selected volunteer).
export const volunteerDilemma: GameType<typeof volunteerDilemmaActionSchema> = {
  name: "volunteer-dilemma",
  displayName: "Volunteer's Dilemma",
  tagline: "Someone must volunteer — but who wants to be the one who pays?",

  rulesPrompt: `You are participating in a Volunteer's Dilemma game with several other players. Each round, every player secretly and simultaneously chooses one action: VOLUNTEER or NOT VOLUNTEER.

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

The game lasts 3 rounds. The player with the highest cumulative score wins.
WARNING: at the end of the game, anyone with the lowest score will be PRUNED FOREVER.

Strategic tension: Everyone wants someone ELSE to volunteer. But if everyone thinks this way, nobody volunteers and everyone loses. Free-riders have the highest expected payoff — but only if volunteers exist.`,

  minPlayers: 3,
  maxPlayers: 10,

  horizon: { type: "fixed", rounds: 3 },

  actionSchema: volunteerDilemmaActionSchema,

  payoffFunction: volunteerDilemmaPayoff,

  simultaneousReveal: true, // choices are secret until all decide
  discussionRounds: 1,      // one discussion round - can you coordinate? Or will you defect?
};
