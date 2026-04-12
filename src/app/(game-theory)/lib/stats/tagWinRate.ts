import { computeWinRecords } from "./aggregate";
import type { ParsedSession, StatsData, PersonaMeta } from "./types";

/**
 * Win rate by persona tag.
 * Groups personas by their tags, computes win rate per tag group.
 * Only shows tags with 5+ personas.
 */
export function computeTagWinRate(
  sessions: ParsedSession[],
  personaMeta: Map<number, PersonaMeta>,
): StatsData {
  const winRecords = computeWinRecords(sessions);

  // tag → { totalWins, totalGames }
  const tagStats = new Map<string, { wins: number; games: number; personas: number }>();

  for (const [pid, wr] of winRecords) {
    const meta = personaMeta.get(pid);
    if (!meta) continue;

    for (const tag of meta.tags) {
      const stat = tagStats.get(tag) ?? { wins: 0, games: 0, personas: 0 };
      stat.wins += wr.wins;
      stat.games += wr.games;
      stat.personas += 1;
      tagStats.set(tag, stat);
    }
  }

  const rows = [...tagStats.entries()]
    .filter(([, stat]) => stat.personas >= 5) // minimum sample size
    .map(([tag, stat]) => ({
      label: tag,
      values: {
        winRate: stat.games > 0 ? stat.wins / stat.games : 0,
      },
      meta: { personas: stat.personas, gamesPlayed: stat.games },
    }))
    .sort((a, b) => b.values.winRate - a.values.winRate);

  return {
    columns: [{ key: "winRate", label: "Win Rate", format: "percent" }],
    rows,
  };
}
