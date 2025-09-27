import "server-only";

import { rootLogger } from "@/lib/logging";
import { waitUntil } from "@vercel/functions";
import { StatReporter } from "@/ai/tools/types";
import { getAnalystPool } from "./data";
import { generatePodcast } from "./generation";
import { selectAnalystsInBatches } from "./selection";

/**
 * Core batch podcast generation function (pure business logic)
 */
export async function batchGeneratePodcasts(params: {
  batchSize?: number;
  targetCount?: number;
  poolLimit?: number;
} = {}): Promise<{
  totalProcessed: number;
  successful: number;
  failed: number;
  selectedAnalystIds: number[];
  results: Array<{
    analystId: number;
    status: "success" | "error";
    error?: string;
    podcastId?: number;
    podcastToken?: string;
  }>;
  summary: {
    poolSize: number;
    selectedCount: number;
    processingTimeMs: number;
  };
}> {
  const { batchSize = 10, targetCount = 10, poolLimit = 10 } = params;

  const startTime = Date.now();
  const logger = rootLogger.child({
    method: "batchGeneratePodcasts",
    batchSize,
    targetCount,
    poolLimit,
  });

  logger.info("Starting batch podcast generation");

  try {
    // Step 1: Get analyst pool
    const pool = await getAnalystPool(poolLimit);

    if (pool.length === 0) {
      logger.warn("No analysts found in pool");
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        selectedAnalystIds: [],
        results: [],
        summary: {
          poolSize: 0,
          selectedCount: 0,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    // Step 2: Select analysts in batches
    const selectedAnalystIds = await selectAnalystsInBatches(pool, batchSize, targetCount, logger);

    if (selectedAnalystIds.length === 0) {
      logger.warn("No analysts selected from pool");
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        selectedAnalystIds: [],
        results: [],
        summary: {
          poolSize: pool.length,
          selectedCount: 0,
          processingTimeMs: Date.now() - startTime,
        },
      };
    }

    logger.info({
      msg: "Starting podcast generation for selected analysts",
      selectedCount: selectedAnalystIds.length,
      selectedIds: selectedAnalystIds,
    });

    // Step 3: Process each analyst in background using waitUntil
    const results: Array<{
      analystId: number;
      status: "success" | "error";
      error?: string;
      podcastId?: number;
      podcastToken?: string;
    }> = [];
    let successful = 0;
    let failed = 0;

    logger.info({
      msg: "Starting background podcast generation for selected analysts",
      selectedIds: selectedAnalystIds,
    });

    // Create background jobs for each analyst
    const backgroundJobs = selectedAnalystIds.map((analystId, index) => {
      const analystLogger = logger.child({
        analystId,
        progress: `${index + 1}/${selectedAnalystIds.length}`,
      });

      return waitUntil(
        (async () => {
          try {
            analystLogger.info("Starting unified podcast generation for analyst");

            // Mock stat reporter for batch generation (also free)
            const batchStatReport: StatReporter = async (dimension, value, extra) => {
              analystLogger.info({
                msg: `[BATCH FREE] statReport: ${dimension}=${value}`,
                extra,
                note: "Batch podcast generation is currently free - tokens not deducted"
              });
            };

            // Create abort signal for this analyst
            const abortController = new AbortController();
            const abortSignal = abortController.signal;

            // Use the new unified method
            const podcast = await generatePodcast({
              analystId,
              abortSignal,
              statReport: batchStatReport,
            });

            analystLogger.info("Unified podcast generation completed successfully", {
              podcastId: podcast.id,
              podcastToken: podcast.token,
            });

            results.push({
              analystId,
              status: "success",
              podcastId: podcast.id,
              podcastToken: podcast.token,
            });
            successful++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            analystLogger.error("Unified podcast generation failed for analyst", {
              error: errorMessage,
            });

            results.push({
              analystId,
              status: "error",
              error: errorMessage,
            });
            failed++;
          }
        })(),
      );
    });

    // Wait for all background jobs to be queued
    await Promise.all(backgroundJobs);

    const processingTimeMs = Date.now() - startTime;

    logger.info({
      msg: "Batch podcast generation completed",
      totalProcessed: selectedAnalystIds.length,
      successful,
      failed,
      processingTimeMs,
    });

    return {
      totalProcessed: selectedAnalystIds.length,
      successful,
      failed,
      selectedAnalystIds,
      results,
      summary: {
        poolSize: pool.length,
        selectedCount: selectedAnalystIds.length,
        processingTimeMs,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ msg: "Batch podcast generation failed", error: errorMessage });

    throw new Error(`Batch podcast generation failed: ${errorMessage}`);
  }
}
