import "server-only";

import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";
import { loadCompletedSessions, groupByGameType, loadPersonaMeta } from "./aggregate";
import { distributionComputers } from "./distribution";
import { modelComparisonComputers } from "./modelComparison";
import { computeModelWinRate } from "./modelWinRate";
import { discussionEffectComputers } from "./discussionEffect";
import { computeOverallLeaderboard, computePersonaLeaderboard } from "./leaderboard";
import { computeTagWinRate } from "./tagWinRate";
import { statsDataSchema } from "./types";
import type { StatsData } from "./types";

const logger = rootLogger.child({ module: "stats-recompute" });

interface RecomputeResult {
  computed: number;
  errors: string[];
  durationMs: number;
}

/**
 * Recompute all statistics and write to GameStats table.
 * Loads data once, runs all computations, validates, and upserts.
 */
export async function recomputeAllStats(): Promise<RecomputeResult> {
  const start = Date.now();
  const errors: string[] = [];
  let computed = 0;

  // 1. Load all completed sessions once
  const allSessions = await loadCompletedSessions();
  logger.info({ msg: "Loaded completed sessions", count: allSessions.length });

  if (allSessions.length === 0) {
    return { computed: 0, errors: [], durationMs: Date.now() - start };
  }

  // 2. Group by game type
  const byGameType = groupByGameType(allSessions);

  // 3. Collect all persona IDs for metadata loading
  const allPersonaIds = new Set<number>();
  for (const s of allSessions) {
    for (const pid of s.personaIds) {
      allPersonaIds.add(pid);
    }
  }
  const personaMeta = await loadPersonaMeta([...allPersonaIds]);

  // 4. Helper to validate and upsert a stat
  async function upsertStat(key: string, data: StatsData, sessionCount: number): Promise<void> {
    const validation = statsDataSchema.safeParse(data);
    if (!validation.success) {
      const err = `Validation failed for ${key}: ${validation.error.message}`;
      logger.error({ msg: err });
      errors.push(err);
      return;
    }

    await prisma.gameStats.upsert({
      where: { key },
      create: { key, data, sessionCount },
      update: { data, sessionCount },
    });
    computed += 1;
  }

  // 5. Tier 1: Per-game-type distributions
  for (const [gameType, sessions] of byGameType) {
    const computeFn = distributionComputers[gameType];
    if (!computeFn) continue;
    try {
      const data = computeFn(sessions);
      await upsertStat(`distribution:${gameType}`, data, sessions.length);
    } catch (err) {
      const msg = `distribution:${gameType} failed: ${(err as Error).message}`;
      logger.error({ msg });
      errors.push(msg);
    }
  }

  // 6. Tier 2A: Model comparison per game type
  for (const [gameType, sessions] of byGameType) {
    const computeFn = modelComparisonComputers[gameType];
    if (!computeFn) continue;
    try {
      const data = computeFn(sessions);
      await upsertStat(`model-comparison:${gameType}`, data, sessions.length);
    } catch (err) {
      const msg = `model-comparison:${gameType} failed: ${(err as Error).message}`;
      logger.error({ msg });
      errors.push(msg);
    }
  }

  // 7. Tier 2A: Cross-game model win rate
  try {
    const data = computeModelWinRate(allSessions);
    await upsertStat("model-winrate:overall", data, allSessions.length);
  } catch (err) {
    const msg = `model-winrate:overall failed: ${(err as Error).message}`;
    logger.error({ msg });
    errors.push(msg);
  }

  // 8. Tier 2B: Discussion effect per game type
  for (const [gameType, sessions] of byGameType) {
    const computeFn = discussionEffectComputers[gameType];
    if (!computeFn) continue;
    try {
      const data = computeFn(sessions);
      await upsertStat(`discussion-effect:${gameType}`, data, sessions.length);
    } catch (err) {
      const msg = `discussion-effect:${gameType} failed: ${(err as Error).message}`;
      logger.error({ msg });
      errors.push(msg);
    }
  }

  // 9. Tier 2C: Leaderboards
  try {
    const data = computeOverallLeaderboard(allSessions, personaMeta);
    await upsertStat("leaderboard:overall", data, allSessions.length);
  } catch (err) {
    const msg = `leaderboard:overall failed: ${(err as Error).message}`;
    logger.error({ msg });
    errors.push(msg);
  }

  try {
    const data = computePersonaLeaderboard(allSessions, personaMeta);
    await upsertStat("leaderboard:persona", data, allSessions.length);
  } catch (err) {
    const msg = `leaderboard:persona failed: ${(err as Error).message}`;
    logger.error({ msg });
    errors.push(msg);
  }

  // 10. Tier 2D: Tag win rate
  try {
    const data = computeTagWinRate(allSessions, personaMeta);
    await upsertStat("tag-winrate:overall", data, allSessions.length);
  } catch (err) {
    const msg = `tag-winrate:overall failed: ${(err as Error).message}`;
    logger.error({ msg });
    errors.push(msg);
  }

  const durationMs = Date.now() - start;
  logger.info({ msg: "Stats recomputation complete", computed, errors: errors.length, durationMs });

  return { computed, errors, durationMs };
}
