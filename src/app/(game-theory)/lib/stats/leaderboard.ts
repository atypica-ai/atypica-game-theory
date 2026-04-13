import { computeWinRecords, getPersonaModel } from "./aggregate";
import type { ParsedSession, StatsData, PersonaMeta } from "./types";
import { HUMAN_PLAYER_ID } from "../../types";

/** Minimum games per game type for a persona to be eligible */
const MIN_GAMES_PER_TYPE = 2;

/**
 * Build the set of persona IDs that have at least MIN_GAMES_PER_TYPE games
 * in every game type they participated in.
 */
function eligiblePersonaIds(sessions: ParsedSession[]): Set<number> {
  // personaId → gameType → game count
  const counts = new Map<number, Map<string, number>>();

  for (const s of sessions) {
    for (const pid of s.personaIds) {
      let byType = counts.get(pid);
      if (!byType) { byType = new Map(); counts.set(pid, byType); }
      byType.set(s.gameType, (byType.get(s.gameType) ?? 0) + 1);
    }
  }

  const eligible = new Set<number>();
  for (const [pid, byType] of counts) {
    const allQualified = [...byType.values()].every((n) => n >= MIN_GAMES_PER_TYPE);
    if (allQualified) eligible.add(pid);
  }
  return eligible;
}

/**
 * Unified leaderboard — ranks all participants by win rate.
 *
 * Eligibility: a persona must have >= 2 games in each game type they
 * participated in. Win rate is computed across all eligible sessions.
 *
 * Each row carries `meta.isHuman` so the frontend can filter client-side
 * between All / AI Only / Human Only.
 */
export function computeOverallLeaderboard(
  sessions: ParsedSession[],
  personaMeta: Map<number, PersonaMeta>,
): StatsData {
  const eligible = eligiblePersonaIds(sessions);
  const winRecords = computeWinRecords(sessions);

  const rows = [...winRecords.entries()]
    .filter(([pid]) => eligible.has(pid))
    .map(([pid, wr]) => {
      const meta = personaMeta.get(pid);
      const isHuman = pid === HUMAN_PLAYER_ID;

      // Try to find name from session participants
      let name = meta?.name ?? `Persona ${pid}`;
      if (isHuman) {
        for (const s of sessions) {
          const participant = s.extra.participants?.find((p) => p.personaId === pid);
          if (participant) {
            name = participant.name;
            break;
          }
        }
      }

      // Find most commonly assigned model
      let model: string | undefined;
      if (!isHuman) {
        const modelCounts = new Map<string, number>();
        for (const s of sessions) {
          if (!s.personaIds.includes(pid)) continue;
          const m = getPersonaModel(s, pid);
          if (m) modelCounts.set(m, (modelCounts.get(m) ?? 0) + 1);
        }
        if (modelCounts.size > 0) {
          model = [...modelCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        }
      }

      return {
        label: name,
        values: {
          winRate: wr.games > 0 ? wr.wins / wr.games : 0,
        },
        meta: {
          personaId: pid,
          isHuman,
          title: meta?.title ?? "",
          tags: meta?.tags ?? [],
          gamesPlayed: wr.games,
          wins: wr.wins,
          ...(model ? { model } : {}),
        },
      };
    })
    .sort((a, b) => b.values.winRate - a.values.winRate);

  return {
    columns: [{ key: "winRate", label: "Win Rate", format: "percent" }],
    rows,
  };
}
