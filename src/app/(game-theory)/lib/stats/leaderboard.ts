import { computeWinRecords, getPersonaModel } from "./aggregate";
import type { ParsedSession, StatsData, PersonaMeta } from "./types";
import { HUMAN_PLAYER_ID } from "../../types";

/**
 * Overall leaderboard — ranks all participants by total win rate.
 * Includes both AI personas and human players.
 */
export function computeOverallLeaderboard(
  sessions: ParsedSession[],
  personaMeta: Map<number, PersonaMeta>,
): StatsData {
  const winRecords = computeWinRecords(sessions);

  const rows = [...winRecords.entries()]
    .filter(([, wr]) => wr.games >= 2) // minimum 2 games for meaningful ranking
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

/**
 * Persona-only leaderboard — AI personas ranked by win rate.
 * Adds model and tags as metadata.
 */
export function computePersonaLeaderboard(
  sessions: ParsedSession[],
  personaMeta: Map<number, PersonaMeta>,
): StatsData {
  // Filter out human sessions for persona-only ranking
  const result = computeOverallLeaderboard(sessions, personaMeta);
  return {
    ...result,
    rows: result.rows.filter((r) => !(r.meta?.isHuman)),
  };
}
