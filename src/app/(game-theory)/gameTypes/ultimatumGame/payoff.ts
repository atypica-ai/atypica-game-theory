import { ultimatumGameActionSchema } from "./schema";
import z from "zod/v3";

type UltimatumGameAction = z.infer<typeof ultimatumGameActionSchema>;

export function ultimatumGamePayoff(
  actions: Record<number, UltimatumGameAction>,
): Record<number, number> {
  const playerIds = Object.keys(actions).map(Number);

  // Find who proposed and who responded
  const proposerId = playerIds.find((id) => actions[id].action === "propose");
  const responderId = playerIds.find((id) => actions[id].action !== "propose");

  if (!proposerId || !responderId) {
    throw new Error("Invalid Ultimatum Game: need one proposer and one responder");
  }

  const proposal = actions[proposerId];
  const response = actions[responderId];

  // If rejected, both get 0
  if (response.action === "reject") {
    return { [proposerId]: 0, [responderId]: 0 };
  }

  // If accepted, distribute according to proposal
  const proposerShare = proposal.proposerShare ?? 50; // default 50-50 if not specified
  const responderShare = 100 - proposerShare;

  return {
    [proposerId]: proposerShare,
    [responderId]: responderShare,
  };
}
