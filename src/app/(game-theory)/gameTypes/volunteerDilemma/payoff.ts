import { VolunteerDilemmaAction } from "./schema";

const BENEFIT = 50; // Public good benefit everyone receives
const COST = 30;    // Cost paid by the selected volunteer

// Volunteer's Dilemma with lottery rule:
// If at least one player volunteers, the public good is produced (everyone gets BENEFIT).
// When multiple volunteers appear, ONE is randomly selected to pay the COST.
// This creates clear winner/loser distinction: free-riders win, selected volunteer loses.
export function volunteerDilemmaPayoff(
  actions: Record<number, VolunteerDilemmaAction>,
): Record<number, number> {
  const playerIds = Object.keys(actions).map(Number);

  const volunteers = playerIds.filter((id) => actions[id].action === "volunteer");
  const publicGoodProvided = volunteers.length > 0;

  const payoffs: Record<number, number> = {};

  if (!publicGoodProvided) {
    // Nobody volunteered → disaster, everyone gets 0
    for (const id of playerIds) {
      payoffs[id] = 0;
    }
    return payoffs;
  }

  // At least one volunteer → public good produced
  // Lottery: randomly select ONE volunteer to pay the cost
  const selectedVolunteerIndex = Math.floor(Math.random() * volunteers.length);
  const selectedVolunteer = volunteers[selectedVolunteerIndex];

  for (const id of playerIds) {
    if (id === selectedVolunteer) {
      // Selected volunteer: gets benefit but pays cost
      payoffs[id] = BENEFIT - COST;
    } else {
      // Everyone else (including non-selected volunteers): gets benefit for free
      payoffs[id] = BENEFIT;
    }
  }

  return payoffs;
}
