"server-only";

import { Logger } from "pino";
import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";
import { EXPIRATION_CONFIG } from "./config";

/**
 * Process expiration test for pulses
 * Marks pulses as expired if delta is below threshold or if they exceed top N limit per category
 *
 * @param pulseIds - Array of pulse IDs to process expiration for
 * @param logger - Optional logger instance (creates child logger if not provided)
 * @returns Statistics on expired and kept pulses
 */
export async function processExpirationTest(
  pulseIds: number[],
  logger?: Logger,
): Promise<{ expired: number; kept: number }> {
  const expirationLogger = logger || rootLogger.child({ module: "expirationTest" });

  if (pulseIds.length === 0) {
    expirationLogger.info("No pulse IDs provided");
    return { expired: 0, kept: 0 };
  }

  try {
    // Query pulses by IDs with HEAT scores (include null heatDelta for new pulses)
    const pulsesWithHeat = await prisma.pulse.findMany({
      where: {
        id: { in: pulseIds },
        heatScore: { not: null },
      },
    });

    if (pulsesWithHeat.length === 0) {
      expirationLogger.info("No pulses with HEAT scores found");
      return { expired: 0, kept: 0 };
    }

    expirationLogger.info({
      pulseCount: pulsesWithHeat.length,
      msg: "Processing expiration test for pulses",
    });

    // Group by category for top N filtering
    const pulsesByCategory = new Map<string, typeof pulsesWithHeat>();
    for (const pulse of pulsesWithHeat) {
      if (!pulsesByCategory.has(pulse.category)) {
        pulsesByCategory.set(pulse.category, []);
      }
      pulsesByCategory.get(pulse.category)!.push(pulse);
    }

    let expired = 0;
    let kept = 0;

    // Process each category
    for (const [category, categoryPulses] of pulsesByCategory) {
      const categoryLogger = expirationLogger.child({ category });

      // Filter by delta threshold
      // New pulses (heatDelta: null) are always kept since they're new
      const newPulses = categoryPulses.filter((p) => p.heatDelta === null && p.heatScore !== null);
      
      // Only pulses with calculated heatDelta are subject to threshold check
      // Exclude null deltas explicitly to avoid treating them as 0
      const aboveThreshold = categoryPulses.filter((p) => {
        return p.heatDelta !== null && p.heatDelta >= EXPIRATION_CONFIG.MIN_HEAT_DELTA_THRESHOLD;
      });

      // Apply top N limit to pulses that passed threshold
      // Sort by delta descending
      const sortedByDelta = aboveThreshold.sort((a, b) => {
        return (b.heatDelta ?? 0) - (a.heatDelta ?? 0);
      });
      // Concatenate new pulses and sort by delta descending, then take top N
      const pulsesToKeep = sortedByDelta.concat(newPulses).slice(0, EXPIRATION_CONFIG.TOP_N_PULSES_PER_CATEGORY);

      // Mark expired pulses:
      // 1. Pulses that failed threshold check (delta < threshold or null but not new)
      // 2. Pulses beyond top N limit from aboveThreshold
      const pulseIdsToExpire = categoryPulses
        .filter((p) => !pulsesToKeep.some((k) => k.id === p.id))
        .map((p) => p.id);

      if (pulseIdsToExpire.length > 0) {
        await prisma.pulse.updateMany({
          where: {
            id: { in: pulseIdsToExpire },
          },
          data: {
            expired: true,
          },
        });

        categoryLogger.info({
          totalPulses: categoryPulses.length,
          aboveThreshold: aboveThreshold.length,
          kept: pulsesToKeep.length,
          expired: pulseIdsToExpire.length,
          pulseIds: pulseIdsToExpire,
          msg: "Processed expiration for category",
        });
      }

      expired += pulseIdsToExpire.length;
      kept += pulsesToKeep.length;
    }

    expirationLogger.info({
      expired,
      kept,
      msg: "Expiration test completed",
    });

    return { expired, kept };
  } catch (error) {
    expirationLogger.error({
      msg: "Expiration test failed",
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
}

