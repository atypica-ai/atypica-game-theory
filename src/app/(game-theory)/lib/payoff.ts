import "server-only";

import { GameType } from "../gameTypes/types";
import { GameTimeline, PersonaDecisionEvent } from "../types";

/**
 * Calculate payoffs for a completed round.
 * Filters persona-decision events for the given round, extracts each player's action,
 * and passes them to gameType.payoffFunction.
 */
export function calculateRoundPayoffs(
  gameType: GameType,
  timeline: GameTimeline,
  round: number,
): Record<number, number> {
  const decisions = timeline.filter(
    (e): e is PersonaDecisionEvent => e.type === "persona-decision" && e.round === round,
  );

  if (decisions.length === 0) {
    throw new Error(`No decisions found for round ${round}`);
  }

  const actions: Record<number, unknown> = {};
  for (const event of decisions) {
    actions[event.personaId] = event.content;
  }

  return gameType.payoffFunction(actions);
}
