import type { LLMModelName } from "@/ai/provider";
import { computeWinRecords, getPersonaModel, groupByGameType } from "./aggregate";
import type { ParsedSession, StatsData } from "./types";

/** Normalize model name to a short display label */
function modelLabel(model: string): string {
  const aliases: Record<string, string> = {
    "claude-haiku-4-5": "Claude Haiku",
    "claude-sonnet-4": "Claude Sonnet",
    "claude-sonnet-4-5": "Claude Sonnet 4.5",
    "gemini-3-flash": "Gemini Flash",
    "gemini-2.5-flash": "Gemini 2.5 Flash",
    "gpt-4.1-mini": "GPT Mini",
    "gpt-5-mini": "GPT 5 Mini",
    "gpt-4o": "GPT 4o",
  };
  return aliases[model] ?? model;
}

/**
 * Cross-game win rate by model.
 * Normalized so each game type contributes equally:
 * 1. Compute win rate per model within each game type
 * 2. Average across game types
 */
export function computeModelWinRate(sessions: ParsedSession[]): StatsData {
  const byGameType = groupByGameType(sessions);

  // model → { sumRates: number, gameCount: number }
  const modelAgg = new Map<string, { sumRates: number; gameCount: number; totalWins: number; totalGames: number }>();

  for (const [, gameSessions] of byGameType) {
    const winRecords = computeWinRecords(gameSessions);

    // Build model → aggregated wins/games for this game type
    const modelGameStats = new Map<string, { wins: number; games: number }>();

    for (const session of gameSessions) {
      for (const pid of session.personaIds) {
        const model = getPersonaModel(session, pid);
        if (!model) continue;
        const wr = winRecords.get(pid);
        if (!wr) continue;

        const stat = modelGameStats.get(model) ?? { wins: 0, games: 0 };
        stat.wins += wr.wins;
        stat.games += wr.games;
        modelGameStats.set(model, stat);
      }
    }

    // Add per-game-type win rates to the cross-game aggregation
    for (const [model, stat] of modelGameStats) {
      const rate = stat.games > 0 ? stat.wins / stat.games : 0;
      const agg = modelAgg.get(model) ?? { sumRates: 0, gameCount: 0, totalWins: 0, totalGames: 0 };
      agg.sumRates += rate;
      agg.gameCount += 1;
      agg.totalWins += stat.wins;
      agg.totalGames += stat.games;
      modelAgg.set(model, agg);
    }
  }

  const rows = [...modelAgg.entries()]
    .map(([model, agg]) => ({
      label: modelLabel(model),
      values: {
        winRate: agg.gameCount > 0 ? agg.sumRates / agg.gameCount : 0,
      },
      meta: {
        model: model as LLMModelName,
        gamesPlayed: agg.totalGames,
        totalWins: agg.totalWins,
      },
    }))
    .sort((a, b) => b.values.winRate - a.values.winRate);

  return {
    columns: [{ key: "winRate", label: "Win Rate", format: "percent" }],
    rows,
  };
}
