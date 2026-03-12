import "server-only";

import { rootLogger } from "@/lib/logging";
import type { Pulse } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import type { Locale } from "next-intl";
import { Logger } from "pino";
import { EXPIRATION_CONFIG } from "../expiration/config";
import { calculateHeatScore } from "./calculateHeat";
import { HEAT_CONFIG } from "./config";
import { gatherPostsForPulse } from "./gatherPosts";
import { generateDescriptionFromPosts } from "./generateDescription";

// Per-pulse processing timeout (ms) — prevents hung LLM calls from blocking the batch
const PULSE_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Process a single pulse through the HEAT pipeline
 * Gather posts → Calculate HEAT → Calculate delta → Generate description → Save
 */
async function processSinglePulse({
  pulse,
  lookbackStart,
  todayStart,
  abortSignal,
  logger,
}: {
  pulse: Pulse;
  lookbackStart: Date;
  todayStart: Date;
  abortSignal: AbortSignal;
  logger: Logger;
}): Promise<{ success: boolean; error?: string }> {
  const pulseLogger = logger.child({
    pulseId: pulse.id,
    pulseTitle: pulse.title,
    category: pulse.category,
  });

  try {
    // Gather posts
    const locale = pulse.locale as Locale;
    const posts = await gatherPostsForPulse({
      pulseId: pulse.id,
      title: pulse.title,
      locale,
      abortSignal,
      logger: pulseLogger,
    });

    if (posts.length === 0) {
      pulseLogger.warn("No posts gathered, skipping HEAT calculation");
      return { success: false, error: "No posts gathered" };
    }

    // Calculate HEAT score
    const heatScore = calculateHeatScore(posts);

    // Calculate HEAT delta as percentage (decimal) change based on yesterday's heat score
    let heatDelta: number | null = null;
    const yesterdayPulse = await prisma.pulse.findFirst({
      where: {
        title: pulse.title,
        category: pulse.category,
        createdAt: {
          gte: lookbackStart,
          lt: todayStart,
        },
        heatScore: { not: null },
        id: { not: pulse.id }, // Exclude current pulse
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (yesterdayPulse?.heatScore && yesterdayPulse.heatScore > 0) {
      // Calculate percentage change: (new - old) / old
      // Example: yesterday=100, today=120 → (120-100)/100 = 0.2 (20% increase)
      // Example: yesterday=100, today=80 → (80-100)/100 = -0.2 (-20% decrease)
      heatDelta = (heatScore - yesterdayPulse.heatScore) / yesterdayPulse.heatScore;
    } else {
      // If no yesterday's pulse found or yesterday's score is 0, delta equals null
      heatDelta = null;
    }

    // Generate description from posts
    const description = await generateDescriptionFromPosts({
      pulse,
      posts,
      locale,
      abortSignal,
      logger: pulseLogger,
    });

    // Update pulse with HEAT score, delta, and description
    await prisma.pulse.update({
      where: { id: pulse.id },
      data: {
        heatScore,
        heatDelta,
        content: description,
      },
    });

    pulseLogger.info({
      heatScore,
      heatDelta,
      postCount: posts.length,
      msg: "Pulse processed successfully",
    });

    return { success: true };
  } catch (error) {
    const errorMessage = (error as Error).message || String(error);
    const errorStack = (error as Error).stack;

    pulseLogger.error({
      msg: "Failed to process pulse",
      error: errorMessage,
      stack: errorStack,
    });

    // Save pulse with null HEAT and record error in extra field
    try {
      const currentExtra = pulse.extra ?? {};
      await prisma.pulse.update({
        where: { id: pulse.id },
        data: {
          heatScore: null,
          heatDelta: null,
          extra: {
            ...currentExtra,
            error: {
              reason: "processing_failed",
              details: errorMessage,
              stack: errorStack,
              timestamp: new Date().toISOString(),
            },
          },
        },
      });
    } catch (updateError) {
      pulseLogger.error({
        msg: "Failed to update pulse with null HEAT and error",
        error: (updateError as Error).message,
      });
    }

    return { success: false, error: errorMessage };
  }
}

/**
 * Process pulses in batches with a maximum worker count
 */
async function processPulsesInBatches({
  pulses,
  lookbackStart,
  todayStart,
  maxWorkers,
  logger,
}: {
  pulses: Pulse[];
  lookbackStart: Date;
  todayStart: Date;
  maxWorkers: number;
  logger: Logger;
}): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  for (let i = 0; i < pulses.length; i += maxWorkers) {
    const batch = pulses.slice(i, i + maxWorkers);
    const batchNum = Math.floor(i / maxWorkers) + 1;
    const totalBatches = Math.ceil(pulses.length / maxWorkers);

    logger.info({
      batch: batchNum,
      totalBatches,
      batchSize: batch.length,
      msg: "Processing heat calculation batch",
    });

    const abortControllers = batch.map(() => new AbortController());
    const timeouts = batch.map((pulse, idx) =>
      setTimeout(() => {
        abortControllers[idx].abort(new Error(`Pulse ${pulse.id} timed out after ${PULSE_TIMEOUT_MS / 1000}s`));
      }, PULSE_TIMEOUT_MS),
    );

    const batchResults = await Promise.allSettled(
      batch.map((pulse, idx) =>
        processSinglePulse({
          pulse,
          lookbackStart,
          todayStart,
          abortSignal: abortControllers[idx].signal,
          logger,
        }),
      ),
    );

    // Clear timeouts for completed pulses
    timeouts.forEach((t) => clearTimeout(t));

    // Process batch results
    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === "fulfilled") {
        if (result.value.success) {
          processed++;
        } else {
          errors++;
        }
      } else {
        errors++;
        logger.error({
          pulseId: batch[j].id,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          msg: "Pulse processing failed with exception",
        });
      }
    }
  }

  return { processed, errors };
}

/**
 * Process HEAT pipeline for pulses
 * Orchestrates: Gather posts → Calculate HEAT → Calculate delta → Generate description → Save
 * Processes pulses in parallel batches for improved performance
 *
 * @param pulseIds - Array of pulse IDs to process
 * @param logger - Optional logger instance (creates child logger if not provided)
 * @returns Statistics on processed pulses
 */
export async function processHeatPipeline(
  pulseIds: number[],
  logger?: Logger,
): Promise<{ processed: number; errors: number }> {
  const pipelineLogger = logger || rootLogger.child({ module: "heatPipeline" });

  if (pulseIds.length === 0) {
    pipelineLogger.warn({ msg: "No pulse IDs provided" });
    return { processed: 0, errors: 0 };
  }

  try {
    // Get pulses by IDs
    const pulses = await prisma.pulse.findMany({
      where: {
        id: { in: pulseIds },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (pulses.length === 0) {
      pipelineLogger.warn({
        pulseIds,
        msg: "No pulses found for provided IDs",
      });
      return { processed: 0, errors: 0 };
    }

    pipelineLogger.info({
      pulseCount: pulses.length,
      pulseIds: pulses.map((p) => p.id),
      msg: "Found pulses for HEAT calculation",
    });

    // Prepare lookback window for finding yesterday's pulses
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    const lookbackStart = new Date(
      yesterday.getTime() - EXPIRATION_CONFIG.YESTERDAY_LOOKBACK_HOURS * 60 * 60 * 1000,
    );

    // Process pulses in parallel batches
    const { processed, errors } = await processPulsesInBatches({
      pulses,
      lookbackStart,
      todayStart,
      maxWorkers: HEAT_CONFIG.MAX_WORKERS,
      logger: pipelineLogger,
    });

    pipelineLogger.info({
      processed,
      errors,
      msg: "HEAT pipeline completed",
    });

    return { processed, errors };
  } catch (error) {
    pipelineLogger.error({
      msg: "HEAT pipeline failed",
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
}
