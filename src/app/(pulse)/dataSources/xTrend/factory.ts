"server-only";

import { prisma } from "@/prisma/prisma";
import { DataSource, DataSourceFactory, DataSourceResult } from "../types";
import { Logger } from "pino";
import { gatherPulsesWithGrok } from "./gatherPulsesWithGrok";

/**
 * Factory that creates one DataSource per xTrend category
 * Each category becomes an independent dataSource that can be triggered separately
 */
export const xTrendFactory: DataSourceFactory = {
  async createDataSources(): Promise<DataSource[]> {
    // Read PulseCategory entries with non-empty queries (xTrend uses query field)
    const categories = await prisma.pulseCategory.findMany({
      where: {
        query: { not: "" }, // Only process categories with queries (xTrend-specific)
      },
      orderBy: { createdAt: "asc" },
    });

    // Create one DataSource per category
    return categories.map((category) => ({
      name: `xTrend:${category.name}`,
      async gatherPulses(logger: Logger): Promise<DataSourceResult> {
        const categoryLogger = logger.child({
          categoryId: category.id,
          categoryName: category.name,
          dataSource: `xTrend:${category.name}`,
        });

        try {
          // Build query for Grok
          const query = `Find trending topics, discussions, and insights on X (Twitter) about ${category.name}. Focus on: ${category.query}. Return 5-10 key trending pulses.`;

          const abortController = new AbortController();
          const pulses = await gatherPulsesWithGrok(query, categoryLogger, abortController.signal);

          // Set categoryName for each pulse (categoryId will be set by orchestrator)
          const pulsesWithCategory = pulses.map((pulse) => ({
            ...pulse,
            categoryName: category.name,
          }));

          categoryLogger.info(
            { pulseCount: pulsesWithCategory.length },
            "Gathered pulses for category",
          );

          return { pulses: pulsesWithCategory };
        } catch (error) {
          categoryLogger.error(
            { error: (error as Error).message },
            "Failed to gather pulses for category",
          );
          // Return empty result on error (don't throw, allow other categories to continue)
          return { pulses: [] };
        }
      },
    }));
  },
};

