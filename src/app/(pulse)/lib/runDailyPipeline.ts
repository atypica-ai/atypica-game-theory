import "server-only";

import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";
import { processExpirationTest } from "../expiration";
import { processHeatPipeline } from "../heat";
import { gatherPulsesFromAllDataSources } from "./gatherSignals";

/**
 * Run the full daily pulse pipeline:
 * 1. Gather pulses from all data sources (includes identity fixing and carry-over)
 * 2. Calculate HEAT scores
 * 3. Process expiration
 */
export async function runDailyPulsePipeline(parentLogger?: Logger): Promise<{
  totalPulses: number;
  heatProcessed: number;
  heatErrors: number;
  expired: number;
  kept: number;
}> {
  const logger = parentLogger ?? rootLogger.child({ module: "dailyPulsePipeline" });

  // Step 1: Gather
  logger.info("Step 1: Gathering pulses from all data sources");
  const gatherResult = await gatherPulsesFromAllDataSources();
  const allPulseIds = gatherResult.pulseIds;

  if (allPulseIds.length === 0) {
    logger.info("No pulses gathered, pipeline complete");
    return { totalPulses: 0, heatProcessed: 0, heatErrors: 0, expired: 0, kept: 0 };
  }

  logger.info({ msg: "Step 1 completed", totalPulses: allPulseIds.length });

  // Step 2: HEAT
  logger.info("Step 2: Calculating HEAT scores");
  const heatResult = await processHeatPipeline(allPulseIds, logger);
  logger.info({
    msg: "Step 2 completed",
    processed: heatResult.processed,
    errors: heatResult.errors,
  });

  // Log failures
  const pulsesWithoutHeat = await prisma.pulse.findMany({
    where: { id: { in: allPulseIds }, heatScore: null },
    select: { id: true, title: true, category: true, extra: true },
  });
  if (pulsesWithoutHeat.length > 0) {
    logger.warn({
      msg: "Pulses without heat scores",
      count: pulsesWithoutHeat.length,
      pulses: pulsesWithoutHeat.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        error: p.extra?.error,
      })),
    });
  }

  // Step 3: Expiration
  logger.info("Step 3: Processing expiration");
  const expirationResult = await processExpirationTest(allPulseIds, logger);
  logger.info({
    msg: "Step 3 completed",
    expired: expirationResult.expired,
    kept: expirationResult.kept,
  });

  const result = {
    totalPulses: allPulseIds.length,
    heatProcessed: heatResult.processed,
    heatErrors: heatResult.errors,
    expired: expirationResult.expired,
    kept: expirationResult.kept,
  };

  logger.info({ msg: "Daily pulse pipeline completed", ...result });
  return result;
}
