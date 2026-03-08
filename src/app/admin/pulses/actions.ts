"use server";

import { getAllDataSources } from "@/app/(pulse)/dataSources";
import { processExpirationTest } from "@/app/(pulse)/expiration";
import { processHeatPipeline } from "@/app/(pulse)/heat";
import {
  gatherPulsesForDataSource,
  gatherPulsesFromAllDataSources,
} from "@/app/(pulse)/lib/gatherSignals";
import { runDailyPulsePipeline } from "@/app/(pulse)/lib/runDailyPipeline";
import { recommendPulsesForActiveUsers } from "@/app/(pulse)/recommendation";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import type { Locale } from "next-intl";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";

export async function getDistinctCategories(): Promise<
  ServerActionResult<Array<{ category: string; pulseCount: number }>>
> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  const results = await prisma.pulse.groupBy({
    by: ["category"],
    _count: { id: true },
    orderBy: { category: "asc" },
  });

  return {
    success: true,
    data: results.map((r) => ({
      category: r.category,
      pulseCount: r._count.id,
    })),
  };
}

/**
 * Trigger pulse gathering for a specific dataSource
 * Supports both base names (e.g., "xTrend") and category-specific names (e.g., "xTrend:AI Tech")
 * If base name is provided and it's a factory, triggers all category-specific dataSources
 */
export async function triggerDataSourceGathering(
  dataSourceName: string,
): Promise<ServerActionResult<{ pulseCount: number }>> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  // If it's a base name (no colon), check if it's a factory and trigger all categories
  if (!dataSourceName.includes(":")) {
    const allDataSources = await getAllDataSources();
    const categoryDataSources = allDataSources.filter((ds) =>
      ds.name.startsWith(`${dataSourceName}:`),
    );

    if (categoryDataSources.length > 0) {
      // Trigger all category-specific dataSources in parallel
      const results = await Promise.all(
        categoryDataSources.map((ds) => gatherPulsesForDataSource(ds.name)),
      );
      const totalPulses = results.reduce((sum, r) => sum + r.pulseCount, 0);
      const allSuccess = results.every((r) => r.success);

      if (allSuccess) {
        return {
          success: true as const,
          data: { pulseCount: totalPulses },
        };
      } else {
        return {
          success: false as const,
          message: "Some data sources failed to gather pulses",
        };
      }
    }
  }

  // Single dataSource (category-specific or non-factory)
  const result = await gatherPulsesForDataSource(dataSourceName);
  if (result.success) {
    return {
      success: true as const,
      data: { pulseCount: result.pulseCount },
    };
  } else {
    return {
      success: false as const,
      message: "Failed to gather pulses",
    };
  }
}

/**
 * Trigger pulse gathering for all dataSources
 */
export async function triggerAllDataSourcesGathering(): Promise<
  ServerActionResult<{
    totalPulses: number;
    results: Array<{ dataSource: string; pulseCount: number }>;
  }>
> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  const result = await gatherPulsesFromAllDataSources();
  return {
    success: true,
    data: result,
  };
}

/**
 * Get all available dataSources (including factory-generated category-specific ones)
 */
export async function getAllAvailableDataSources(): Promise<
  ServerActionResult<
    Array<{ name: string; isCategory: boolean; baseName?: string; categoryName?: string }>
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  const dataSources = await getAllDataSources();

  const result = dataSources.map((ds) => {
    // Check if it's a category-specific dataSource (e.g., "xTrend:AI Tech")
    if (ds.name.includes(":")) {
      const [baseName, categoryName] = ds.name.split(":", 2);
      return {
        name: ds.name,
        isCategory: true,
        baseName,
        categoryName,
      };
    }
    return {
      name: ds.name,
      isCategory: false,
    };
  });

  return {
    success: true,
    data: result,
  };
}

/**
 * Trigger HEAT calculation pipeline
 * Processes pulses: gather posts → calculate HEAT → generate description
 *
 * @param category - Optional category string to filter pulses
 * @param includeAlreadyScored - Whether to include pulses that already have HEAT scores
 * @param onlyUnscored - Process all unscored pulses in current data range (ignores category and date filters)
 * @param pulseIds - Optional array of pulse IDs to retry (if provided, other params are ignored)
 */
export async function triggerHeatPipeline(
  category?: string,
  includeAlreadyScored: boolean = false,
  onlyUnscored: boolean = false,
  pulseIds?: number[],
): Promise<ServerActionResult<{ processed: number; errors: number }>> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  let targetPulseIds: number[];

  // If pulseIds provided, use them directly (for retrying failed pulses)
  if (pulseIds && pulseIds.length > 0) {
    targetPulseIds = pulseIds;
  } else {
    // Query pulses based on filters
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const pulses = await prisma.pulse.findMany({
      where: {
        ...(onlyUnscored
          ? {}
          : {
              ...(category ? { category } : {}),
              createdAt: { gte: todayStart },
            }),
        ...(includeAlreadyScored || onlyUnscored ? {} : { heatScore: null }),
        ...(onlyUnscored ? { heatScore: null } : {}),
      },
      select: { id: true },
    });

    targetPulseIds = pulses.map((p) => p.id);
  }

  const result = await processHeatPipeline(targetPulseIds);
  return {
    success: true,
    data: result,
  };
}

/**
 * Trigger expiration test
 * Calculates HEAT delta and marks expired pulses
 *
 * @param category - Optional category string to filter pulses
 * @param pulseIds - Optional array of pulse IDs to retry (if provided, category is ignored)
 */
export async function triggerExpirationTest(
  category?: string,
  pulseIds?: number[],
): Promise<ServerActionResult<{ expired: number; kept: number }>> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  let targetPulseIds: number[];

  // If pulseIds provided, use them directly (for retrying failed pulses)
  if (pulseIds && pulseIds.length > 0) {
    targetPulseIds = pulseIds;
  } else {
    // Query pulse IDs by category (if provided)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const pulses = await prisma.pulse.findMany({
      where: {
        ...(category ? { category } : {}),
        createdAt: { gte: todayStart },
        heatScore: { not: null },
        // Include pulses with null heatDelta (new pulses) - they will be kept by expiration logic
      },
      select: { id: true },
    });

    targetPulseIds = pulses.map((p) => p.id);
  }

  const result = await processExpirationTest(targetPulseIds);
  return {
    success: true,
    data: result,
  };
}

/**
 * Get pulse statistics
 */
export async function getPulseStatistics(): Promise<
  ServerActionResult<{
    total: number;
    withHeat: number;
    expired: number;
    recentPulses: Array<{
      id: number;
      title: string;
      categoryName: string;
      heatScore: number | null;
      heatDelta: number | null;
      expired: boolean;
      createdAt: Date;
      postCount: number;
    }>;
  }>
> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  const [total, withHeat, expired, recentPulses] = await Promise.all([
    prisma.pulse.count(),
    prisma.pulse.count({ where: { heatScore: { not: null } } }),
    prisma.pulse.count({ where: { expired: true } }),
    prisma.pulse.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        heatScore: true,
        heatDelta: true,
        expired: true,
        createdAt: true,
        extra: true,
      },
    }),
  ]);

  return {
    success: true,
    data: {
      total,
      withHeat,
      expired,
      recentPulses: recentPulses.map((p) => ({
        id: p.id,
        title: p.title,
        categoryName: p.category,
        heatScore: p.heatScore,
        heatDelta: p.heatDelta,
        expired: p.expired,
        createdAt: p.createdAt,
        postCount: (p.extra as { posts?: unknown[] } | null)?.posts?.length ?? 0,
      })),
    },
  };
}

/**
 * Trigger pulse recommendation
 *
 * @param userIds - Optional specific user IDs. If omitted, recommends for all active users.
 */
export async function triggerRecommendation(
  userIds?: number[],
): Promise<
  ServerActionResult<{
    totalUsers: number;
    successfulUsers: number;
    failedUsers: number;
    totalPulsesRecommended: number;
  }>
> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  const result = await recommendPulsesForActiveUsers(userIds);
  return {
    success: true,
    data: result,
  };
}

/**
 * Run the full daily pipeline: gather → HEAT → expiration
 * Same logic as the internal API /api/internal/gather-pulses
 */
export async function triggerFullPipeline(): Promise<
  ServerActionResult<{
    totalPulses: number;
    heatProcessed: number;
    heatErrors: number;
    expired: number;
    kept: number;
  }>
> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  const result = await runDailyPulsePipeline();
  return { success: true, data: result };
}

type XTrendCategory = { name: string; query: string; locale: Locale };

/**
 * Get xTrend category config from SystemConfig
 */
export async function getXTrendCategoryConfig(): Promise<
  ServerActionResult<{ categories: XTrendCategory[] }>
> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  const config = await prisma.systemConfig.findUnique({
    where: { key: "pulse:xTrend:categories" },
  });

  return {
    success: true,
    data: { categories: (config?.value as XTrendCategory[]) ?? [] },
  };
}

/**
 * Update xTrend category config in SystemConfig
 */
export async function updateXTrendCategoryConfig(
  categories: XTrendCategory[],
): Promise<ServerActionResult<{ categories: XTrendCategory[] }>> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  const config = await prisma.systemConfig.upsert({
    where: { key: "pulse:xTrend:categories" },
    update: { value: categories },
    create: { key: "pulse:xTrend:categories", value: categories },
  });

  return {
    success: true,
    data: { categories: config.value as XTrendCategory[] },
  };
}
