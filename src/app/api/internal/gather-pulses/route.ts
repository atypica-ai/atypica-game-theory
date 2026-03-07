import { NextRequest, NextResponse } from "next/server";
import { rootLogger } from "@/lib/logging";
import { gatherPulsesFromAllDataSources } from "@/app/(pulse)/lib/gatherSignals";
import { processHeatPipeline } from "@/app/(pulse)/heat";
import { processExpirationTest } from "@/app/(pulse)/expiration";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/prisma/prisma";

function validateInternalAuth(request: NextRequest): boolean {
  const internalSecret = request.headers.get("x-internal-secret");
  return internalSecret === process.env.INTERNAL_API_SECRET;
}

/**
 * POST /api/internal/gather-pulses
 * 
 * Linear workflow for pulse gathering:
 * 1. Gather today's new pulses from all data sources (includes identity fixing and carry-over)
 * 2. Calculate HEAT for all "today's pulses" (new + carried over)
 * 3. Process expiration based on calculated HEAT and HEAT delta
 */
export async function POST(request: NextRequest) {
  const logger = rootLogger.child({ api: "gather-pulses" });

  if (!validateInternalAuth(request)) {
    logger.warn("Unauthorized access to gather-pulses API");
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  logger.info("Starting pulse gathering workflow");

  // Execute workflow in background using waitUntil
  waitUntil(
    (async () => {
      try {
        // STEP 1: Gather pulses from all data sources (includes identity fixing and carry-over)
        logger.info("Step 1: Gathering pulses from all data sources");
        const gatherResult = await gatherPulsesFromAllDataSources();
        const allTodayPulseIds = gatherResult.pulseIds;

        if (allTodayPulseIds.length === 0) {
          logger.info("No pulses gathered, workflow complete");
          return;
        }

        logger.info({
          totalToday: allTodayPulseIds.length,
          msg: "Step 1 completed: Pulses gathered, identity fixed, and carry-over processed",
        });

        // STEP 2: Calculate HEAT for all today's pulses
        logger.info("Step 2: Calculating HEAT for today's pulses");
        const heatResult = await processHeatPipeline(allTodayPulseIds, logger);

        logger.info({
          processed: heatResult.processed,
          errors: heatResult.errors,
          msg: "Step 2 completed: HEAT calculated",
        });

        // Log pulses without heat scores
        const pulsesWithoutHeat = await prisma.pulse.findMany({
          where: {
            id: { in: allTodayPulseIds },
            heatScore: null,
          },
          select: {
            id: true,
            title: true,
            category: true,
            extra: true,
          },
        });

        if (pulsesWithoutHeat.length > 0) {
          logger.warn({
            msg: "Pulses without heat scores after HEAT calculation",
            count: pulsesWithoutHeat.length,
            pulseIds: pulsesWithoutHeat.map((p) => p.id),
            pulses: pulsesWithoutHeat.map((p) => ({
              id: p.id,
              title: p.title,
              category: p.category,
              error: (p.extra as Record<string, unknown>)?.error,
            })),
          });
        }

        // STEP 3: Process expiration based on HEAT delta
        logger.info("Step 3: Processing expiration test");
        const expirationResult = await processExpirationTest(allTodayPulseIds, logger);

        logger.info({
          expired: expirationResult.expired,
          kept: expirationResult.kept,
          msg: "Step 3 completed: Expiration processed",
        });

        logger.info({
          totalToday: allTodayPulseIds.length,
          heatProcessed: heatResult.processed,
          heatErrors: heatResult.errors,
          expired: expirationResult.expired,
          kept: expirationResult.kept,
          msg: "Pulse gathering workflow completed",
        });
      } catch (error) {
        logger.error({
          msg: "Pulse gathering workflow failed",
          error: (error as Error).message,
          stack: (error as Error).stack,
        });
      }
    })(),
  );

  return NextResponse.json({
    success: true,
    message: "Pulse gathering workflow scheduled",
  });
}

