"server-only";

import { loadUserMemory } from "@/app/(memory)/lib/loadMemory";
import { llm } from "@/ai/provider";
import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";
import { generateObject } from "ai";
import { RECOMMEND_CONFIG } from "./config";
import { pulseRecommendationPrompt } from "./prompt";
import {
  recommendOutputSchema,
  type RecommendPulsesResult,
  type PulseRecommendationItem,
} from "./types";
import { getNonExpiredPulseFilter } from "../lib/pulseFilters";

const logger = rootLogger.child({ module: "recommendPulses" });

/**
 * Shared function to query fresh pulses created in last N hours
 * Used by both memory-based and random selection paths
 */
async function getFreshPulses(configOverrides?: {
  pulseFreshHours?: number;
  maxPulsesToFilter?: number;
}) {
  const pulseFreshHours = configOverrides?.pulseFreshHours ?? RECOMMEND_CONFIG.PULSE_FRESH_HOURS;
  const maxPulsesToFilter = configOverrides?.maxPulsesToFilter ?? RECOMMEND_CONFIG.MAX_PULSES_TO_FILTER;
  const cutoffTime = new Date(Date.now() - pulseFreshHours * 60 * 60 * 1000);
  return await prisma.pulse.findMany({
    where: {
      createdAt: { gte: cutoffTime },
      ...getNonExpiredPulseFilter(),
    },
    orderBy: { createdAt: "desc" },
    take: maxPulsesToFilter,
    select: {
      id: true,
      title: true,
      content: true,
      category: true,
      createdAt: true,
    },
  });
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Recommend pulses for a user based on their memory profile
 *
 * @param userId - User ID to generate recommendations for
 * @param configOverrides - Optional configuration overrides
 * @returns Object with success status, pulse count, and pulse IDs
 */
export async function recommendPulsesForUser(
  userId: number,
  configOverrides?: {
    pulseFreshHours?: number;
    maxRecommendedPulses?: number;
    maxPulsesToFilter?: number;
  },
): Promise<RecommendPulsesResult> {
  const userLogger = logger.child({ userId });

  try {
    userLogger.info("Starting pulse recommendation for user");

    // 1. Load user memory
    const memory = await loadUserMemory(userId);
    const memoryExists = memory.trim().length > 0;

    userLogger.info({
      memoryExists,
      memoryLength: memory.length,
    });

    // 2. Get fresh pulses pool
    const freshPulses = await getFreshPulses(configOverrides);

    if (freshPulses.length === 0) {
      userLogger.info("No fresh pulses available, returning empty recommendations");
      return {
        success: true,
        pulseCount: 0,
        pulseIds: [],
        recommendations: [],
      };
    }

    userLogger.info({
      freshPulsesCount: freshPulses.length,
    });

    let recommendations: PulseRecommendationItem[];
    let method: "memory_based" | "random";
    let reasoning: string | undefined;

    // 3. Branch based on memory existence
    if (memoryExists) {
      // Memory-based LLM filtering
      userLogger.info("Using memory-based LLM filtering");

      // Format pulses for LLM input (include content for better angle generation)
      const pulsesText = freshPulses
        .map(
          (pulse) =>
            `Pulse ID: ${pulse.id}\nTitle: ${pulse.title}\nCategory: ${pulse.category}\n`,
        )
        .join("\n---\n");

      const maxRecommendedPulses =
        configOverrides?.maxRecommendedPulses ?? RECOMMEND_CONFIG.MAX_RECOMMENDED_PULSES;
      const userPrompt = `## User Memory\n\n${memory}\n\n## Available Pulses\n\n${pulsesText}\n\nSelect up to ${maxRecommendedPulses} pulses that are most relevant to this user. `;

      try {
        const result = await generateObject({
          model: llm("gpt-5-mini"),
          system: pulseRecommendationPrompt,
          prompt: userPrompt,
          schema: recommendOutputSchema,
          maxRetries: 2,
        });

        recommendations = result.object.recommendations.slice(0, maxRecommendedPulses);
        reasoning = result.object.reasoning;

        userLogger.info({
          selectedCount: recommendations.length,
          reasoning,
          usage: result.usage,
        });

        method = "memory_based";
      } catch (error) {
        userLogger.error(
          {
            error: (error as Error).message,
          },
          "LLM filtering failed, falling back to random selection",
        );
        // Fallback to random selection if LLM fails
        const maxRecommendedPulses =
          configOverrides?.maxRecommendedPulses ?? RECOMMEND_CONFIG.MAX_RECOMMENDED_PULSES;
        const shuffled = shuffleArray(freshPulses);
        recommendations = shuffled
          .slice(0, maxRecommendedPulses)
          .map((p) => ({
            pulseId: p.id,
            angle: `Explore this trending topic: ${p.title}`,
          }));
        method = "random";
      }
    } else {
      // Random selection for new users
      userLogger.info("Using random selection for new user");
      const maxRecommendedPulses =
        configOverrides?.maxRecommendedPulses ?? RECOMMEND_CONFIG.MAX_RECOMMENDED_PULSES;
      const shuffled = shuffleArray(freshPulses);
      recommendations = shuffled
        .slice(0, maxRecommendedPulses)
        .map((p) => ({
          pulseId: p.id,
          angle: `Discover this trending topic: ${p.title}`,
        }));
      method = "random";
    }

    // 4. Store recommendations in UserPulseRecommendation table
    // Always create a new record to maintain history
    const pulseIds = recommendations.map((r) => r.pulseId);
    // TODO: 推荐功能暂缓，UserPulseRecommendation 表未创建，跳过写入
    // 启用时取消以下注释，并恢复 InputJsonValue import
    /*
    const recommendationData: InputJsonValue = recommendations.map((r) => ({
      id: r.pulseId,
      angle: r.angle,
    }));
    const extra: InputJsonValue = {
      method,
      ...(reasoning && { reasoning }),
    };
    await prisma.userPulseRecommendation.create({
      data: {
        userId,
        pulseIds,
        recommendation: recommendationData,
        extra,
      },
    });
    */

    userLogger.info({
      msg: "Recommendation generated (not persisted — table not yet created)",
      pulseCount: recommendations.length,
      method,
    });

    return {
      success: true,
      pulseCount: recommendations.length,
      pulseIds,
      recommendations,
    };
  } catch (error) {
    userLogger.error(
      {
        error: (error as Error).message,
        stack: (error as Error).stack,
      },
      "Failed to recommend pulses for user",
    );
    return {
      success: false,
      pulseCount: 0,
      pulseIds: [],
      recommendations: [],
    };
  }
}

