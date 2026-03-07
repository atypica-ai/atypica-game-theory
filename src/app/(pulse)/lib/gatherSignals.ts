import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";
import { getAllDataSources, getDataSource, type DataSourceName } from "../dataSources";
import { Pulse as DataSourcePulse } from "../dataSources/types";
import type { PulseExtra } from "@/prisma/client";
import { processPulseIdentityAndCarryOver } from "./processPulseIdentity";

/**
 * Gather pulses from a specific dataSource by name
 * Supports both base names (e.g., "xTrend") and category-specific names (e.g., "xTrend:AI Tech")
 */
export async function gatherPulsesForDataSource(
  dataSourceName: DataSourceName,
): Promise<{ success: boolean; pulseCount: number; pulseIds: number[] }> {
  const logger = rootLogger.child({ dataSource: dataSourceName, operation: "gatherPulses" });

  const dataSource = await getDataSource(dataSourceName);
  if (!dataSource) {
    logger.error(`DataSource "${dataSourceName}" not found`);
    return { success: false, pulseCount: 0, pulseIds: [] };
  }

  try {
    const result = await dataSource.gatherPulses(logger);

    if (result.pulses.length === 0) {
      logger.info("No pulses gathered");
      return { success: true, pulseCount: 0, pulseIds: [] };
    }

    const now = new Date();

    const pulsesToCreate = result.pulses.map((pulse: DataSourcePulse) => {
      // Extract base dataSource name (e.g., "xTrend" from "xTrend:AI Tech")
      const baseDataSourceName = dataSourceName.includes(":") ? dataSourceName.split(":")[0] : dataSourceName;

      // Set expireAt = createdAt + 7 days
      const expireAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      return {
        category: pulse.categoryName,
        dataSource: baseDataSourceName,
        title: pulse.title,
        content: pulse.content,
        locale: "en-US",
        expireAt,
        extra: (pulse.metadata || {}) as PulseExtra,
      };
    });

    // Create all pulses
    const created = await Promise.all(pulsesToCreate.map((data) => prisma.pulse.create({ data })));

    const pulseIds = created.map((p) => p.id);

    logger.info({
      pulseCount: created.length,
      pulseIds,
      msg: "Pulses gathered and saved successfully",
    });

    return { success: true, pulseCount: created.length, pulseIds };
  } catch (error) {
    logger.error({ msg: "Failed to gather pulses", error: (error as Error).message });
    return { success: false, pulseCount: 0, pulseIds: [] };
  }
}

/**
 * Gather pulses from all registered dataSources
 * Factories are automatically expanded, so all category-level dataSources run in parallel
 */
export async function gatherPulsesFromAllDataSources(): Promise<{
  totalPulses: number;
  results: Array<{ dataSource: string; success: boolean; pulseCount: number }>;
  pulseIds: number[];
}> {
  const logger = rootLogger.child({ operation: "gatherPulsesFromAll" });
  const dataSources = await getAllDataSources();

  logger.info({ msg: "Starting pulse gathering from all dataSources", dataSourceCount: dataSources.length });

  // Execute all dataSources in parallel (including category-level xTrend dataSources)
  const promises = dataSources.map(async (dataSource) => {
    // Use the actual dataSource name (could be "xTrend:AI Tech" for category-specific)
    const result = await gatherPulsesForDataSource(dataSource.name).catch((error) => {
      logger.error({ msg: "Failed to gather pulses from dataSource", dataSource: dataSource.name, error: (error as Error).message });
      return { success: false, pulseCount: 0, pulseIds: [] };
    });

    return {
      dataSource: dataSource.name,
      ...result,
    };
  });

  const results = await Promise.all(promises);
  const totalPulses = results.reduce((sum, r) => sum + r.pulseCount, 0);
  const allPulseIds = results.flatMap((r) => r.pulseIds || []);

  logger.info({ msg: "Completed pulse gathering from all dataSources", totalPulses, results });

  // Step 2: Process pulse identity and carry-over for gathered pulse IDs
  const allProcessedPulseIds = [...allPulseIds];
  if (allPulseIds.length > 0) {
    const { carriedOverPulseIds } = await processPulseIdentityAndCarryOver(
      allPulseIds,
      logger,
    );
    allProcessedPulseIds.push(...carriedOverPulseIds);
    logger.info({
      carriedOverPulseIds: carriedOverPulseIds.length,
      msg: "Completed pulse identity processing",
    });
  }

  return { totalPulses, results, pulseIds: allProcessedPulseIds };
}
