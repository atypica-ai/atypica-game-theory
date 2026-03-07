import { NextRequest, NextResponse } from "next/server";
import { rootLogger } from "@/lib/logging";
import { recommendPulsesForUser, RECOMMEND_CONFIG } from "@/app/(pulse)/recommendation";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/prisma/prisma";
import { z } from "zod";

const logger = rootLogger.child({ api: "recommend-pulses" });

/**
 * Optional config schema for API request body
 */
const recommendPulsesConfigSchema = z.object({
  userActiveDays: z.number().int().positive().optional(),
  pulseFreshHours: z.number().int().positive().optional(),
  maxRecommendedPulses: z.number().int().positive().optional(),
  maxPulsesToFilter: z.number().int().positive().optional(),
});

function validateInternalAuth(request: NextRequest): boolean {
  const internalSecret = request.headers.get("x-internal-secret");
  return internalSecret === process.env.INTERNAL_API_SECRET;
}

/**
 * Process users in batches with a maximum worker count
 */
async function processUsersInBatches(
  userIds: number[],
  maxWorkers: number,
  configOverrides?: {
    userActiveDays?: number;
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
          return {
            userId,
            success: result.success,
            pulseCount: result.pulseCount,
          };
        } catch (error) {
          logger.error(
            {
              userId,
              error: (error as Error).message,
            },
            "Failed to recommend pulses for user",
          );
          return {
            userId,
            success: false,
            pulseCount: 0,
            error: (error as Error).message,
          };
        }
      }),
    );
    results.push(...batchResults);
  }

  return results;
}

export async function POST(request: NextRequest) {
  const apiLogger = logger.child({ requestId: crypto.randomUUID() });

  if (!validateInternalAuth(request)) {
    apiLogger.warn("Unauthorized access to recommend-pulses API");
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  apiLogger.info("Starting pulse recommendation for active users");

  try {
    // Parse optional config from request body
    let configOverrides: {
      userActiveDays?: number;
      pulseFreshHours?: number;
      maxRecommendedPulses?: number;
      maxPulsesToFilter?: number;
    } | undefined;

    try {
      const body = await request.json();
      const parsed = recommendPulsesConfigSchema.safeParse(body);
      if (parsed.success) {
        configOverrides = {
          ...(parsed.data.userActiveDays !== undefined && {
            userActiveDays: parsed.data.userActiveDays,
          }),
          ...(parsed.data.pulseFreshHours !== undefined && {
            pulseFreshHours: parsed.data.pulseFreshHours,
          }),
          ...(parsed.data.maxRecommendedPulses !== undefined && {
            maxRecommendedPulses: parsed.data.maxRecommendedPulses,
          }),
          ...(parsed.data.maxPulsesToFilter !== undefined && {
            maxPulsesToFilter: parsed.data.maxPulsesToFilter,
          }),
        };
        if (Object.keys(configOverrides).length > 0) {
          apiLogger.info({ configOverrides }, "Using custom config overrides");
        }
      }
    } catch {
      // Request body is optional, ignore parsing errors
    }

    // 1. Query users who are active within last N days (configurable)
    // Active = either logged in recently OR have UserChat activity recently
    // This catches both users who log in regularly and users who keep sessions active
    const userActiveDays = configOverrides?.userActiveDays ?? RECOMMEND_CONFIG.USER_ACTIVE_DAYS;
    const cutoffDate = new Date(Date.now() - userActiveDays * 24 * 60 * 60 * 1000);
    const cutoffTimestamp = cutoffDate.getTime();
    const users = await prisma.user.findMany({
      where: {
        OR: [
          // User logged in within last 30 days
          {
            profile: {
              lastLogin: {
                path: ["timestamp"],
                gte: cutoffTimestamp,
              },
            },
          },
          // OR user has UserChat activity within last 30 days
          {
            userChats: {
              some: {
                updatedAt: {
                  gte: cutoffDate,
                },
              },
            },
          },
        ],
        teamIdAsMember: null, // Only personal users
      },
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);
    apiLogger.info({
      activeUsersCount: userIds.length,
      cutoffDate: cutoffDate.toISOString(),
    });

    if (userIds.length === 0) {
      apiLogger.info("No active users found");
      return NextResponse.json({
        success: true,
        totalUsers: 0,
        processedUsers: 0,
        successfulUsers: 0,
        failedUsers: 0,
        totalPulsesRecommended: 0,
      });
    }

    // 2. Process users in parallel with worker pool (using waitUntil for background execution)
    waitUntil(
      processUsersInBatches(userIds, RECOMMEND_CONFIG.MAX_WORKERS, configOverrides)
        .then((results) => {
          const successful = results.filter((r) => r.success);
          const failed = results.filter((r) => !r.success);
          const totalPulsesRecommended = results.reduce((sum, r) => sum + r.pulseCount, 0);

          apiLogger.info({
            totalUsers: userIds.length,
            processedUsers: results.length,
            successfulUsers: successful.length,
            failedUsers: failed.length,
            totalPulsesRecommended,
          });

          if (failed.length > 0) {
            apiLogger.warn(
              {
                failedUserIds: failed.map((f) => f.userId),
                failedErrors: failed.map((f) => ({ userId: f.userId, error: f.error })),
              },
              "Some users failed to process",
            );
          }
        })
        .catch((error) => {
          apiLogger.error(
            {
              error: (error as Error).message,
              stack: (error as Error).stack,
            },
            "Failed to process users in batches",
          );
        }),
    );

    // Return immediately with scheduled status
    return NextResponse.json({
      success: true,
      message: "Pulse recommendation scheduled for active users",
      totalUsers: userIds.length,
      scheduledAt: new Date().toISOString(),
    });
  } catch (error) {
    apiLogger.error(
      {
        error: (error as Error).message,
        stack: (error as Error).stack,
      },
      "Failed to start pulse recommendation process",
    );
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

