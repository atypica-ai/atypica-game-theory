"server-only";

import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";
import { recommendPulsesForUser } from "./recommendPulses";
import { RECOMMEND_CONFIG } from "./config";

const logger = rootLogger.child({ module: "recommendForActiveUsers" });

/**
 * Recommend pulses for a batch of users in parallel with worker pool
 */
async function processUsersInBatches(
  userIds: number[],
  maxWorkers: number,
  configOverrides?: {
    pulseFreshHours?: number;
    maxRecommendedPulses?: number;
    maxPulsesToFilter?: number;
  },
): Promise<Array<{ userId: number; success: boolean; pulseCount: number; error?: string }>> {
  const results: Array<{ userId: number; success: boolean; pulseCount: number; error?: string }> = [];

  for (let i = 0; i < userIds.length; i += maxWorkers) {
    const batch = userIds.slice(i, i + maxWorkers);
    const batchResults = await Promise.all(
      batch.map(async (userId) => {
        try {
          const result = await recommendPulsesForUser(userId, configOverrides);
          return { userId, success: result.success, pulseCount: result.pulseCount };
        } catch (error) {
          logger.error({ msg: "Failed to recommend pulses for user", userId, error: (error as Error).message });
          return { userId, success: false, pulseCount: 0, error: (error as Error).message };
        }
      }),
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Query active users: logged in or had UserChat activity within last N days
 */
async function getActiveUserIds(activeDays: number): Promise<number[]> {
  const cutoffDate = new Date(Date.now() - activeDays * 24 * 60 * 60 * 1000);
  const cutoffTimestamp = cutoffDate.getTime();

  const users = await prisma.user.findMany({
    where: {
      OR: [
        {
          profile: {
            lastLogin: {
              path: ["timestamp"],
              gte: cutoffTimestamp,
            },
          },
        },
        {
          userChats: {
            some: {
              updatedAt: { gte: cutoffDate },
            },
          },
        },
      ],
      teamIdAsMember: null, // Only personal users
    },
    select: { id: true },
  });

  return users.map((u) => u.id);
}

/**
 * Recommend pulses for all active users (for cronjob / admin trigger)
 *
 * @param userIds - Optional specific user IDs. If omitted, queries all active users.
 * @param configOverrides - Optional overrides for recommendation config
 */
export async function recommendPulsesForActiveUsers(
  userIds?: number[],
  configOverrides?: {
    userActiveDays?: number;
    pulseFreshHours?: number;
    maxRecommendedPulses?: number;
    maxPulsesToFilter?: number;
  },
): Promise<{
  totalUsers: number;
  successfulUsers: number;
  failedUsers: number;
  totalPulsesRecommended: number;
}> {
  const activeDays = configOverrides?.userActiveDays ?? RECOMMEND_CONFIG.USER_ACTIVE_DAYS;

  // Resolve target users
  const targetUserIds = userIds ?? await getActiveUserIds(activeDays);

  logger.info({ msg: "Starting batch recommendation", userCount: targetUserIds.length });

  if (targetUserIds.length === 0) {
    logger.info("No users to recommend for");
    return { totalUsers: 0, successfulUsers: 0, failedUsers: 0, totalPulsesRecommended: 0 };
  }

  const results = await processUsersInBatches(targetUserIds, RECOMMEND_CONFIG.MAX_WORKERS, configOverrides);

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const totalPulsesRecommended = results.reduce((sum, r) => sum + r.pulseCount, 0);

  logger.info({
    msg: "Batch recommendation completed",
    totalUsers: targetUserIds.length,
    successfulUsers: successful.length,
    failedUsers: failed.length,
    totalPulsesRecommended,
  });

  if (failed.length > 0) {
    logger.warn({
      msg: "Some users failed",
      failedUserIds: failed.map((f) => f.userId),
    });
  }

  return {
    totalUsers: targetUserIds.length,
    successfulUsers: successful.length,
    failedUsers: failed.length,
    totalPulsesRecommended,
  };
}
