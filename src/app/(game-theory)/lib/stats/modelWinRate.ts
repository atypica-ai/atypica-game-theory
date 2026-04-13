import type { LLMModelName } from "@/ai/provider";
import { computeWinRecords, getPersonaModel, groupByGameType } from "./aggregate";
import type { ParsedSession, StatsData } from "./types";
import type { RoundResultEvent } from "../../types";

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

  // model → { sumRates, gameCount, totalWins, totalGames, totalPayoff, payoffSessions }
  const modelAgg = new Map<string, {
    sumRates: number; gameCount: number;
    totalWins: number; totalGames: number;
    totalPayoff: number; payoffSessions: number;
  }>();

  for (const [, gameSessions] of byGameType) {
    const winRecords = computeWinRecords(gameSessions);

    // Build model → aggregated wins/games for this game type
    const modelGameStats = new Map<string, { wins: number; games: number }>();

    for (const session of gameSessions) {
      // Accumulate per-persona cumulative payoff for this session
      const sessionPayoffs = new Map<number, number>();
      for (const event of session.timeline) {
        if (event.type !== "round-result") continue;
        const rr = event as RoundResultEvent;
        for (const [pidStr, payoff] of Object.entries(rr.payoffs)) {
          const pid = Number(pidStr);
          sessionPayoffs.set(pid, (sessionPayoffs.get(pid) ?? 0) + payoff);
        }
      }

      for (const pid of session.personaIds) {
        const model = getPersonaModel(session, pid);
        if (!model) continue;
        const wr = winRecords.get(pid);
        if (!wr) continue;

        const stat = modelGameStats.get(model) ?? { wins: 0, games: 0 };
        stat.wins += wr.wins;
        stat.games += wr.games;
        modelGameStats.set(model, stat);

        // Track cumulative payoff per model (across all sessions)
        const payoff = sessionPayoffs.get(pid) ?? 0;
        const agg = modelAgg.get(model) ?? {
          sumRates: 0, gameCount: 0,
          totalWins: 0, totalGames: 0,
          totalPayoff: 0, payoffSessions: 0,
        };
        agg.totalPayoff += payoff;
        agg.payoffSessions += 1;
        modelAgg.set(model, agg);
      }
    }

    // Add per-game-type win rates to the cross-game aggregation
    for (const [model, stat] of modelGameStats) {
      const rate = stat.games > 0 ? stat.wins / stat.games : 0;
      const agg = modelAgg.get(model) ?? {
        sumRates: 0, gameCount: 0,
        totalWins: 0, totalGames: 0,
        totalPayoff: 0, payoffSessions: 0,
      };
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
        avgPayoff: agg.payoffSessions > 0
          ? Math.round((agg.totalPayoff / agg.payoffSessions) * 10) / 10
          : 0,
      },
    }))
    .sort((a, b) => b.values.winRate - a.values.winRate);

  return {
    columns: [{ key: "winRate", label: "Win Rate", format: "percent" }],
    rows,
  };
}
