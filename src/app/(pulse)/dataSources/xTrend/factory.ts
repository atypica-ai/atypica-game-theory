import "server-only";

import { prisma } from "@/prisma/prisma";
import type { Locale } from "next-intl";
import { Logger } from "pino";
import { DataSource, DataSourceFactory, DataSourceResult } from "../types";
import { gatherPulsesWithGrok } from "./gatherPulsesWithGrok";

type XTrendCategory = { name: string; query: string; locale: Locale };

/**
 * Factory that creates one DataSource per xTrend category
 * Categories are stored in SystemConfig (key: "pulse:xTrend:categories")
 */
export const xTrendFactory: DataSourceFactory = {
  async createDataSources(): Promise<DataSource[]> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "pulse:xTrend:categories" },
    });

    const categories: XTrendCategory[] = (config?.value as XTrendCategory[]) ?? [];

    return categories.map((category) => ({
      name: `xTrend:${category.name}`,
      async gatherPulses(logger: Logger): Promise<DataSourceResult> {
        const categoryLogger = logger.child({
          categoryName: category.name,
          dataSource: `xTrend:${category.name}`,
        });

        try {
          const query = category.locale === "zh-CN"
            ? `在 X (Twitter) 上搜索关于「${category.name}」的热门话题和讨论。重点关注：${category.query}。返回 5-10 个最热门的话题。`
            : `Find trending topics, discussions, and insights on X (Twitter) about ${category.name}. Focus on: ${category.query}. Return 5-10 key trending pulses.`;

          const abortController = new AbortController();
          const pulses = await gatherPulsesWithGrok({
            query,
            locale: category.locale,
            logger: categoryLogger,
            abortSignal: abortController.signal,
          });

          const pulsesWithCategory = pulses.map((pulse) => ({
            ...pulse,
            categoryName: category.name,
            locale: category.locale,
          }));

          categoryLogger.info({
            msg: "Gathered pulses for category",
            pulseCount: pulsesWithCategory.length,
          });

          return { pulses: pulsesWithCategory };
        } catch (error) {
          categoryLogger.error({
            msg: "Failed to gather pulses for category",
            error: (error as Error).message,
          });
          return { pulses: [] };
        }
      },
    }));
  },
};
