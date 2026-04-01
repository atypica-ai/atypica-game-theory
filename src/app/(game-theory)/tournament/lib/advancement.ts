import "server-only";

import { prisma } from "@/prisma/prisma";
import { GameSessionExtra, GameTimeline, RoundResultEvent } from "../../types";

/**
 * Aggregate payoffs for all players across all game sessions in a stage,
 * rank them together (1224 competition ranking), and return the IDs of
 * players whose rank <= n.
 *
 * 1224 ranking: ties share a rank; the next rank skips the tied count.
 *   e.g. payoffs [35, 30, 30, 20] → ranks [1, 2, 2, 4]
 *        top-2 → advances = [rank 1, rank 2, rank 2] = 3 players
 *
 * Pass n = Infinity to advance everyone (last stage).
 */
export async function calculateStageAdvancing(
  gameSessionTokens: string[],
  n: number,
): Promise<number[]> {
  const sessions = await prisma.gameSession.findMany({
    where: { token: { in: gameSessionTokens } },
    select: { token: true, timeline: true, extra: true },
  });

  // Aggregate totalPayoff per personaId across all sessions
  const totals = new Map<number, number>();
  const names = new Map<number, string>();

  for (const session of sessions) {
    const timeline = (Array.isArray(session.timeline) ? session.timeline : []) as GameTimeline;
    const extra = (session.extra ?? {}) as GameSessionExtra;

    // Register participant names (so players with 0 payoff still appear)
    for (const p of extra.participants ?? []) {
      if (!names.has(p.personaId)) {
        names.set(p.personaId, p.name);
        totals.set(p.personaId, 0);
      }
    }

    // Sum payoffs from round-result events
    for (const event of timeline) {
      if ((event as RoundResultEvent).type === "round-result") {
        const re = event as RoundResultEvent;
        for (const [idStr, payoff] of Object.entries(re.payoffs)) {
          const id = Number(idStr);
          totals.set(id, (totals.get(id) ?? 0) + payoff);
        }
      }
    }
  }

  // Build sorted player list (descending by totalPayoff)
  const players = Array.from(totals.entries())
    .map(([personaId, totalPayoff]) => ({ personaId, totalPayoff }))
    .sort((a, b) => b.totalPayoff - a.totalPayoff);

  if (players.length === 0) return [];

  // Assign 1224 competition ranks
  // rank = 1 + (number of players with strictly higher payoff)
  const ranked = players.map((p) => ({
    ...p,
    rank: 1 + players.filter((other) => other.totalPayoff > p.totalPayoff).length,
  }));

  return ranked.filter((p) => p.rank <= n).map((p) => p.personaId);
}
