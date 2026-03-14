"use server";

import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import type { Prisma } from "@/prisma/client";
import { createStudyUserChatAction } from "@/app/(study)/study/actions";
import { getNonExpiredPulseFilter } from "../lib/pulseFilters";
import { sortPulsesByHeatDelta } from "./utils/sorting";
import { getLocale } from "next-intl/server";
import type { Locale } from "next-intl";

const marketplacePulseSelect = {
  id: true,
  title: true,
  content: true,
  category: true,
  heatScore: true,
  heatDelta: true,
  createdAt: true,
} as const;

type MarketplacePulseRow = Prisma.PulseGetPayload<{
  select: typeof marketplacePulseSelect;
}>;

const TREEMAP_DEFAULT_LOOKBACK_DAYS = 30;
const TREEMAP_MIN_LOOKBACK_DAYS = 7;
const TREEMAP_MAX_LOOKBACK_DAYS = 60;

/**
 * Shared pulse query builder used across frontend display and admin operations
 * Ensures consistent selection logic between what users see and what admins process
 */
export async function fetchMarketplacePulseRows(params: {
  pulseIds?: number[];
  categoryName?: string;
  createdAtGte?: Date;
  createdAtLte?: Date;
  requireHeatScore?: boolean | null; // null = no filter, true = has score, false = no score
  take?: number;
  orderBy?: Prisma.PulseOrderByWithRelationInput | Prisma.PulseOrderByWithRelationInput[];
  locale?: Locale;
}): Promise<MarketplacePulseRow[]> {
  const where: Prisma.PulseWhereInput = {
    ...getNonExpiredPulseFilter(),
  };

  // Filter by locale if provided
  if (params.locale) {
    where.locale = params.locale;
  }

  if (params.pulseIds && params.pulseIds.length > 0) {
    where.id = { in: params.pulseIds };
  }

  if (params.categoryName) {
    where.category = params.categoryName;
  }

  if (params.createdAtGte || params.createdAtLte) {
    where.createdAt = {};
    if (params.createdAtGte) where.createdAt.gte = params.createdAtGte;
    if (params.createdAtLte) where.createdAt.lte = params.createdAtLte;
  }

  if (params.requireHeatScore === true) {
    where.heatScore = { not: null };
  } else if (params.requireHeatScore === false) {
    where.heatScore = null;
  }
  // If undefined, no heatScore filter applied

  return prisma.pulse.findMany({
    where,
    select: marketplacePulseSelect,
    orderBy: params.orderBy,
    take: params.take,
  });
}

function getPulseIdentityKey(row: MarketplacePulseRow): string {
  return `${row.category}|${row.title}`;
}

function normalizeTreemapLookbackDays(lookbackDays: number): number {
  return Math.min(Math.max(lookbackDays, TREEMAP_MIN_LOOKBACK_DAYS), TREEMAP_MAX_LOOKBACK_DAYS);
}

async function fetchTreemapWindowRows(lookbackDays: number, locale?: Locale): Promise<MarketplacePulseRow[]> {
  const safeLookback = normalizeTreemapLookbackDays(lookbackDays);
  const start = new Date();
  start.setDate(start.getDate() - safeLookback);

  return fetchMarketplacePulseRows({
    createdAtGte: start,
    requireHeatScore: true,
    orderBy: { createdAt: "desc" },
    locale,
  });
}

function buildLatestPulseRowsByIdentity(rows: MarketplacePulseRow[]): {
  latestRows: MarketplacePulseRow[];
  historyByIdentity: Map<string, Array<{ createdAt: Date; heatScore: number }>>;
} {
  const latestByIdentity = new Map<string, MarketplacePulseRow>();
  const historyByIdentity = new Map<string, Array<{ createdAt: Date; heatScore: number }>>();

  for (const row of rows) {
    if (row.heatScore === null) continue;
    const identity = getPulseIdentityKey(row);
    if (!latestByIdentity.has(identity)) {
      latestByIdentity.set(identity, row);
    }

    const history = historyByIdentity.get(identity) ?? [];
    history.push({
      createdAt: row.createdAt,
      heatScore: row.heatScore,
    });
    historyByIdentity.set(identity, history);
  }

  return {
    latestRows: [...latestByIdentity.values()],
    historyByIdentity,
  };
}

/**
 * Fetch all pulse categories for the category bar
 */
export async function fetchPulseCategories(): Promise<
  ServerActionResult<Array<{ name: string }>>
> {
  try {
    const locale = await getLocale();
    const result = await prisma.pulse.findMany({
      where: { ...getNonExpiredPulseFilter(), locale },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return {
      success: true,
      data: result.map((r) => ({ name: r.category })),
    };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}

/**
 * Fetch user's latest recommendations with full pulse details
 */
export async function fetchUserRecommendations(): Promise<
  ServerActionResult<{
    recommendations: Array<{
      pulseId: number;
      angle: string;
      pulse: {
        id: number;
        title: string;
        content: string;
        category: string;
        createdAt: Date;
        heatScore: number;
        heatDelta: number | null;
        history: HeatHistoryPoint[];
      };
    }>;
    method: "memory_based" | "random" | null;
    createdAt: Date | null;
  }>
> {
  // TODO: 推荐功能暂缓，UserPulseRecommendation 表未创建
  // 启用时：将 withAuth callback 参数改回 (user)，删除提前 return，取消下方注释
  return withAuth(async () => {
    return {
      success: true,
      data: {
        recommendations: [],
        method: null,
        createdAt: null,
      },
    };

    /*
    try {
      // Get latest recommendation for user
      const recommendation = await prisma.userPulseRecommendation.findFirst({
        where: { userId: user.id },
        select: {
          recommendation: true,
          extra: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!recommendation) {
        return {
          success: true,
          data: {
            recommendations: [],
            method: null,
            createdAt: null,
          },
        };
      }

      const recommendationData = recommendation.recommendation as
        | Array<{ id: number; angle: string }>
        | null;

      if (!recommendationData || recommendationData.length === 0) {
        return {
          success: true,
          data: {
            recommendations: [],
            method: (recommendation.extra as { method?: string } | undefined)?.method as
              | "memory_based"
              | "random"
              | null,
            createdAt: recommendation.createdAt,
          },
        };
      }

      // Fetch pulse details for all recommended pulse IDs
      const locale = await getLocale();
      const pulseIds = recommendationData.map((r) => r.id);
      const rows = await fetchMarketplacePulseRows({
        pulseIds,
        orderBy: [
          { heatDelta: "desc" }, // Order by heatDelta descending
          { createdAt: "desc" }, // Secondary sort by createdAt
        ],
        locale,
      });

      // Build history for each pulse
      const treemapWindowRows = await fetchTreemapWindowRows(TREEMAP_DEFAULT_LOOKBACK_DAYS, locale);
      const { historyByIdentity } = buildLatestPulseRowsByIdentity(treemapWindowRows);

      // Create a map for quick lookup with history
      const pulseMap = new Map(
        rows.map((p) => {
          const identity = getPulseIdentityKey(p);
          const allHistory = historyByIdentity.get(identity) ?? [];
          const historyByDay = new Map<string, HeatHistoryPoint>();
          allHistory
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .forEach((item) => {
              const day = item.createdAt.toISOString().split("T")[0];
              historyByDay.set(day, { date: day, heatScore: item.heatScore });
            });

          return [
            p.id,
            {
              id: p.id,
              title: p.title,
              content: p.content,
              category: p.category,
              createdAt: p.createdAt,
              heatScore: p.heatScore ?? 0,
              heatDelta: p.heatDelta,
              history: [...historyByDay.values()],
            },
          ];
        }),
      );

      // Combine recommendations with pulse data, maintaining order from recommendation array
      const recommendations = recommendationData
        .map((rec) => {
          const pulse = pulseMap.get(rec.id);
          if (!pulse) return null;
          return {
            pulseId: rec.id,
            angle: rec.angle,
            pulse,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      const extra = recommendation.extra as { method?: string } | undefined;

      return {
        success: true,
        data: {
          recommendations,
          method: (extra?.method as "memory_based" | "random") || null,
          createdAt: recommendation.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
    */
  });
}

/**
 * Fetch pulses by category
 */
export async function fetchPulsesByCategory(
  categoryName?: string,
): Promise<
  ServerActionResult<
    Array<{
      id: number;
      title: string;
      content: string;
      category: string;
      createdAt: Date;
      heatScore: number;
      heatDelta: number | null;
      history: HeatHistoryPoint[];
    }>
  >
> {
  try {
    const locale = await getLocale();
    // Keep card data exactly aligned with treemap source:
    // - same lookback window
    // - must have heat score
    // - latest version per (category + title) identity
    const treemapWindowRows = await fetchTreemapWindowRows(TREEMAP_DEFAULT_LOOKBACK_DAYS, locale);
    const { latestRows, historyByIdentity } = buildLatestPulseRowsByIdentity(treemapWindowRows);

    const filteredRows = latestRows
      .filter((row) => {
        if (categoryName) return row.category === categoryName;
        return true;
      })
      .sort(sortPulsesByHeatDelta)
      .slice(0, 100);

    const pulses = filteredRows.map((row) => {
      const identity = getPulseIdentityKey(row);
      const allHistory = historyByIdentity.get(identity) ?? [];
      const historyByDay = new Map<string, HeatHistoryPoint>();
      allHistory
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .forEach((item) => {
          const day = item.createdAt.toISOString().split("T")[0];
          historyByDay.set(day, { date: day, heatScore: item.heatScore });
        });

      return {
        id: row.id,
        title: row.title,
        content: row.content,
        category: row.category,
        createdAt: row.createdAt,
        heatScore: row.heatScore ?? 0,
        heatDelta: row.heatDelta,
        history: [...historyByDay.values()],
      };
    });

    return {
      success: true,
      data: pulses,
    };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}

/**
 * Fetch pulses with heat scores for map visualization (public version)
 */
export async function fetchPulsesForMapPublic(
  daysBack: number = 7,
): Promise<
  ServerActionResult<{
    pulses: Array<{
      id: number;
      title: string;
      category: string;
      heatScore: number | null;
      heatDelta: number | null;
      createdAt: Date;
    }>;
    heatHistory: Record<number, Array<{ date: string; heatScore: number }>>;
    dates: string[]; // Array of date strings for the time slider
  }>
> {
  try {
    const locale = await getLocale();
    // Calculate date range using UTC to avoid timezone issues
    const now = new Date();
    // Get today's date in UTC (end of today)
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    // Get start date (daysBack days ago, start of that day)
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack, 0, 0, 0, 0));

    // Fetch all pulses with heat scores in the date range
    const rows = await fetchMarketplacePulseRows({
      createdAtGte: startDate,
      createdAtLte: endDate,
      requireHeatScore: true,
      orderBy: { createdAt: "desc" },
      locale,
    });
    const pulses = rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      heatScore: row.heatScore,
      heatDelta: row.heatDelta,
      createdAt: row.createdAt,
    }));

    // Generate date strings for slider (oldest first, index 0 = oldest, last index = newest/today)
    // Include today by going from daysBack-1 down to 0, which gives us daysBack days total
    const dates: string[] = [];
    // Use UTC to avoid timezone issues - reuse the now variable
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(todayUTC);
      date.setUTCDate(date.getUTCDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }

    // Fetch heat history for each pulse
    const heatHistory: Record<number, Array<{ date: string; heatScore: number }>> = {};

    // Group pulses by title+category to find historical versions
    const pulseGroups = new Map<string, typeof pulses>();
    for (const pulse of pulses) {
      const key = `${pulse.title}|${pulse.category}`;
      if (!pulseGroups.has(key)) {
        pulseGroups.set(key, []);
      }
      pulseGroups.get(key)!.push(pulse);
    }

    // For each pulse group, create history from all versions
    for (const [, groupPulses] of pulseGroups.entries()) {
      // Sort by creation date
      const sorted = [...groupPulses].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      // Create history for each pulse
      for (const pulse of groupPulses) {
        const history: Array<{ date: string; heatScore: number }> = [];

        // Include all pulses up to and including this one
        for (const historicalPulse of sorted) {
          if (
            historicalPulse.createdAt <= pulse.createdAt &&
            historicalPulse.heatScore !== null
          ) {
            const dateStr = historicalPulse.createdAt.toISOString().split("T")[0];
            // Avoid duplicates
            if (!history.some((h) => h.date === dateStr)) {
              history.push({
                date: dateStr,
                heatScore: historicalPulse.heatScore,
              });
            }
          }
        }

        // Ensure we have at least the current pulse's heat score
        if (history.length === 0 && pulse.heatScore !== null) {
          history.push({
            date: pulse.createdAt.toISOString().split("T")[0],
            heatScore: pulse.heatScore,
          });
        }

        if (history.length > 0) {
          heatHistory[pulse.id] = history;
        }
      }
    }

    return {
      success: true,
      data: {
        pulses,
        heatHistory,
        dates,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}

export async function startFastInsightResearch(
  angle: string,
): Promise<ServerActionResult<{ userChatToken: string }>> {
  return withAuth(async () => {
    try {
      const result = await createStudyUserChatAction(
        {
          role: "user",
          content: angle,
        },
        undefined,
      );

      if (!result.success) {
        return {
          success: false,
          message: result.message || "Failed to start research",
        };
      }

      return {
        success: true,
        data: {
          userChatToken: result.data.token,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  });
}

type HeatHistoryPoint = { date: string; heatScore: number };

type HeatTreemapPulse = {
  id: number;
  title: string;
  content: string;
  heatScore: number;
  heatDelta: number | null;
  createdAt: Date;
  history: HeatHistoryPoint[];
};

type HeatTreemapCategory = {
  id: number;
  name: string;
  heatScore: number;
  pulseCount: number;
  pulses: HeatTreemapPulse[];
};

/**
 * Fetch HEAT treemap data for public visualization (no admin auth required)
 */
export async function fetchPulseHeatTreemapDataPublic(
  lookbackDays: number = 30,
): Promise<
  ServerActionResult<{
    categories: HeatTreemapCategory[];
    updatedAt: string;
  }>
> {
  try {
    const locale = await getLocale();
    const now = new Date();
    const rows = await fetchTreemapWindowRows(lookbackDays, locale);
    const { latestRows, historyByIdentity } = buildLatestPulseRowsByIdentity(rows);

    const categories = new Map<string, HeatTreemapCategory>();
    for (const pulse of latestRows) {
      const identity = getPulseIdentityKey(pulse);
      const allHistory = historyByIdentity.get(identity) ?? [];
      const historyByDay = new Map<string, HeatHistoryPoint>();
      allHistory
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .forEach((item) => {
          const day = item.createdAt.toISOString().split("T")[0];
          historyByDay.set(day, { date: day, heatScore: item.heatScore });
        });

      const history = [...historyByDay.values()].slice(-5);

      const currentCategory = categories.get(pulse.category) ?? {
        id: 0,
        name: pulse.category,
        heatScore: 0,
        pulseCount: 0,
        pulses: [],
      };

      currentCategory.pulses.push({
        id: pulse.id,
        title: pulse.title,
        content: pulse.content,
        heatScore: pulse.heatScore ?? 0,
        heatDelta: pulse.heatDelta,
        createdAt: pulse.createdAt,
        history,
      });
      currentCategory.heatScore += pulse.heatScore ?? 0;
      currentCategory.pulseCount += 1;
      categories.set(pulse.category, currentCategory);
    }

    const categoryList = [...categories.values()]
      .map((category, index) => ({
        ...category,
        id: index + 1,
        pulses: category.pulses.sort((a, b) => b.heatScore - a.heatScore),
      }))
      .sort((a, b) => b.heatScore - a.heatScore);

    return {
      success: true,
      data: {
        categories: categoryList,
        updatedAt: now.toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}

