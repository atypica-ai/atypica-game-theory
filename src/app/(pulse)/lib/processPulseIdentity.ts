"server-only";

import { prisma } from "@/prisma/prisma";
import { InputJsonValue } from "@prisma/client/runtime/client";
import { Logger } from "pino";
import { matchPulseIdentities } from "./fixPulseIdentity";
import { EXPIRATION_CONFIG } from "../expiration/config";

/**
 * Process pulse identity fixing and carry-over for given pulse IDs
 * 
 * Flow:
 * 1. Match today's pulses with yesterday's pulses (get ID pairs)
 * 2. Update matched pulses: title + matchedYesterdayPulseId
 * 3. Carry over unmatched yesterday's pulses: non-expired, above threshold, TOP N
 * 4. Create carried-over pulses with incremented carriedOverDays
 * 
 * ALL extra field updates happen here in ONE place.
 * 
 * @param pulseIds - Array of pulse IDs to process (typically today's newly gathered pulses)
 * @param logger - Logger instance
 */
export async function processPulseIdentityAndCarryOver(
  pulseIds: number[],
  logger: Logger,
): Promise<{ carriedOverPulseIds: number[] }> {
  const processingLogger = logger.child({ operation: "processPulseIdentityAndCarryOver" });

  if (pulseIds.length === 0) {
    processingLogger.info("No pulse IDs provided");
    return { carriedOverPulseIds: [] };
  }

  try {
    // Date ranges
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Get pulses by IDs
    const todayPulses = await prisma.pulse.findMany({
      where: { id: { in: pulseIds } },
      select: { id: true, title: true, content: true, categoryId: true, extra: true },
    });

    if (todayPulses.length === 0) {
      processingLogger.warn({
        pulseIds,
        msg: "No pulses found for provided IDs",
      });
      return { carriedOverPulseIds: [] };
    }

    processingLogger.info({
      pulseCount: todayPulses.length,
      msg: "Starting pulse identity and carry-over",
    });

    // Group by category
    const pulsesByCategory = new Map<number, typeof todayPulses>();
    for (const pulse of todayPulses) {
      if (!pulsesByCategory.has(pulse.categoryId)) {
        pulsesByCategory.set(pulse.categoryId, []);
      }
      pulsesByCategory.get(pulse.categoryId)!.push(pulse);
    }

    const allCarriedOverPulseIds: number[] = [];

    // Process each category
    for (const [categoryId, pulses] of pulsesByCategory) {
      const categoryLogger = processingLogger.child({ categoryId });

      try {
        // STEP 1: Match today's pulses with yesterday's pulses
        const matchPairs = await matchPulseIdentities(pulses, categoryId, categoryLogger);
        const matchMap = new Map(matchPairs.map((m) => [m.oldPulseId, m]));

        // STEP 2: Update matched pulses - title + matchedYesterdayPulseId
        await Promise.all(
          matchPairs.map(async (match) => {
            const currentExtra = (pulses.find((p) => p.id === match.newPulseId)?.extra || {}) as Record<string, unknown>;
            const updatedExtra: Record<string, unknown> = {
              ...currentExtra,
              matchedYesterdayPulseId: match.oldPulseId,
            };

            await prisma.pulse.update({
              where: { id: match.newPulseId },
              data: {
                title: match.oldTitle,
                extra: updatedExtra as InputJsonValue,
              },
            });

            categoryLogger.debug({
              newPulseId: match.newPulseId,
              oldPulseId: match.oldPulseId,
              reason: match.reason,
              msg: "Updated matched pulse",
            });
          }),
        );


        // STEP 3: Get yesterday's pulses for carry-over
        const yesterdayPulses = await prisma.pulse.findMany({
          where: {
            categoryId,
            expired: false,
            heatDelta: { not: null },
            createdAt: { gte: yesterdayStart, lt: todayStart },
          },
          orderBy: { heatDelta: "desc" },
        });

        if (yesterdayPulses.length === 0) {
          categoryLogger.debug("No yesterday's pulses");
          continue;
        }

        // STEP 4: Filter yesterday's pulses
        // a) Exclude matched ones
        const unmatchedYesterday = yesterdayPulses.filter((p) => !matchMap.has(p.id));
        // b) Filter by threshold
        const aboveThreshold = unmatchedYesterday.filter(
          (p) => (p.heatDelta ?? 0) >= EXPIRATION_CONFIG.MIN_HEAT_DELTA_THRESHOLD,
        );
        // c) TOP N
        const topN = aboveThreshold.slice(0, EXPIRATION_CONFIG.TOP_N_PULSES_PER_CATEGORY);

        // STEP 5: Check uniqueness - filter out pulses with titles already existing today
        // Query today's pulses for this category to get existing titles
        const todayPulsesForCategory = await prisma.pulse.findMany({
          where: {
            categoryId,
            createdAt: { gte: todayStart },
          },
          select: { title: true },
        });
        const existingTitlesToday = new Set(todayPulsesForCategory.map((p) => p.title));

        // Filter out duplicates (same title already exists today)
        const uniqueTopN = topN.filter((pulse) => !existingTitlesToday.has(pulse.title));

        categoryLogger.info({
          totalYesterday: yesterdayPulses.length,
          matched: matchPairs.length,
          unmatched: unmatchedYesterday.length,
          aboveThreshold: aboveThreshold.length,
          topN: topN.length,
          duplicatesFiltered: topN.length - uniqueTopN.length,
          uniqueToCarryOver: uniqueTopN.length,
          msg: "Filtered yesterday's pulses",
        });

        // STEP 6: Create carried-over pulses with incremented carriedOverDays
        if (uniqueTopN.length > 0) {
          const createdPulses = await Promise.all(
            uniqueTopN.map(async (pulse) => {
              const yesterdayExtra = (pulse.extra || {}) as Record<string, unknown>;
              const previousDays =
                typeof yesterdayExtra.carriedOverDays === "number"
                  ? yesterdayExtra.carriedOverDays
                  : 0;

              const updatedExtra: Record<string, unknown> = {
                ...yesterdayExtra,
                carriedOverDays: previousDays + 1,
              };

              return prisma.pulse.create({
                data: {
                  categoryId: pulse.categoryId,
                  dataSource: pulse.dataSource,
                  title: pulse.title,
                  content: pulse.content,
                  locale: pulse.locale,
                  expireAt: pulse.expireAt,
                  createdAt: new Date(),
                  heatScore: null,
                  heatDelta: null,
                  expired: false,
                  extra: updatedExtra as InputJsonValue,
                },
              });
            }),
          );

          const createdPulseIds = createdPulses.map((p) => p.id);
          allCarriedOverPulseIds.push(...createdPulseIds);
          categoryLogger.info({
            carriedOver: uniqueTopN.length,
            pulseIds: createdPulseIds,
            msg: "Carried over pulses",
          });
        }
      } catch (error) {
        categoryLogger.error({
          msg: "Failed to process category",
          error: (error as Error).message,
        });
      }
    }

    processingLogger.info({
      carriedOverPulseIds: allCarriedOverPulseIds.length,
      categoriesProcessed: pulsesByCategory.size,
      msg: "Completed pulse identity and carry-over",
    });

    return {
      carriedOverPulseIds: allCarriedOverPulseIds,
    };
  } catch (error) {
    processingLogger.error({
      msg: "Failed to process pulse identity and carry-over",
      error: (error as Error).message,
    });
    return { carriedOverPulseIds: [] };
  }
}

