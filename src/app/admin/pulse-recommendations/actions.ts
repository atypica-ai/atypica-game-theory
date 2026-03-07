"use server";

import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { ServerActionResult } from "@/lib/serverAction";
import { recommendPulsesForUser } from "@/app/(pulse)/recommendation";
import { getNonExpiredPulseFilter } from "@/app/(pulse)/lib/pulseFilters";
import { prisma } from "@/prisma/prisma";

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
 * Test pulse recommendation for a specific user
 */
export async function testPulseRecommendation(
  userId: number,
): Promise<
  ServerActionResult<{
    success: boolean;
    pulseCount: number;
    pulseIds: number[];
    recommendations: Array<{ pulseId: number; angle: string }>;
    pulses: Array<{
      id: number;
      title: string;
      content: string;
      category: { name: string };
      createdAt: Date;
    }>;
    recommendation: {
      method?: string;
      reasoning?: string;
      createdAt?: Date;
      updatedAt?: Date;
    } | null;
  }>
> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return {
      success: false,
      message: `User with ID ${userId} not found`,
    };
  }

  // Generate recommendations
  const result = await recommendPulsesForUser(userId);

  if (!result.success) {
    return {
      success: false,
      message: "Failed to generate recommendations",
    };
  }

  // Fetch pulse details
  const pulses =
    result.pulseIds.length > 0
      ? await prisma.pulse.findMany({
          where: {
            id: { in: result.pulseIds },
            ...getNonExpiredPulseFilter(),
          },
          select: {
            id: true,
            title: true,
            content: true,
            category: { select: { name: true } },
            createdAt: true,
          },
          orderBy: { id: "asc" }, // Maintain order from recommendation
        })
      : [];

  // Fetch latest recommendation metadata from UserPulseRecommendation
  const recommendation = await prisma.userPulseRecommendation.findFirst({
    where: { userId },
    select: {
      recommendation: true,
      extra: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const extra = recommendation?.extra as { method?: string; reasoning?: string } | undefined;
  const recommendationData = recommendation?.recommendation as
    | Array<{ id: number; angle: string }>
    | undefined;

  // Map recommendation data from DB format [{id, angle}] to API format [{pulseId, angle}]
  const recommendationsFromDb =
    recommendationData?.map((r) => ({
      pulseId: r.id,
      angle: r.angle,
    })) || result.recommendations;

  return {
    success: true,
    data: {
      success: result.success,
      pulseCount: result.pulseCount,
      pulseIds: result.pulseIds,
      recommendations: recommendationsFromDb,
      pulses,
      recommendation: recommendation
        ? {
            method: extra?.method,
            reasoning: extra?.reasoning,
            createdAt: recommendation.createdAt,
            updatedAt: recommendation.updatedAt,
          }
        : null,
    },
  };
}

/**
 * Fetch HEAT treemap data for admin visualization
 */
export async function fetchPulseHeatTreemapData(
  lookbackDays: number = 30,
): Promise<
  ServerActionResult<{
    categories: HeatTreemapCategory[];
    updatedAt: string;
  }>
> {
  await checkAdminAuth([AdminPermission.MANAGE_CONTENT]);

  try {
    const safeLookback = Math.min(Math.max(lookbackDays, 7), 60);
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - safeLookback);

    const rows = await prisma.pulse.findMany({
      where: {
        createdAt: { gte: start },
        heatScore: { not: null },
        ...getNonExpiredPulseFilter(),
      },
      select: {
        id: true,
        title: true,
        content: true,
        heatScore: true,
        heatDelta: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    type PulseRow = (typeof rows)[number];
    const latestByIdentity = new Map<string, PulseRow>();
    const historyByIdentity = new Map<string, Array<{ createdAt: Date; heatScore: number }>>();

    for (const row of rows) {
      if (row.heatScore === null) continue;
      const identity = `${row.category.id}|${row.title}`;
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

    const categories = new Map<number, HeatTreemapCategory>();
    for (const [identity, pulse] of latestByIdentity.entries()) {
      const allHistory = historyByIdentity.get(identity) ?? [];
      const historyByDay = new Map<string, HeatHistoryPoint>();
      allHistory
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .forEach((item) => {
          const day = item.createdAt.toISOString().split("T")[0];
          historyByDay.set(day, { date: day, heatScore: item.heatScore });
        });

      const history = [...historyByDay.values()].slice(-5);

      const currentCategory = categories.get(pulse.category.id) ?? {
        id: pulse.category.id,
        name: pulse.category.name,
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
      categories.set(pulse.category.id, currentCategory);
    }

    const categoryList = [...categories.values()]
      .map((category) => ({
        ...category,
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
