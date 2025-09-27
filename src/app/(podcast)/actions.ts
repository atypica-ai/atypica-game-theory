"use server";

import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, AnalystPodcast } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import {
  fetchPodcastsForAnalyst,
  generatePodcastAudio,
  generatePodcastScript,
  PodcastGenerationParams,
  podcastObjectUrlToHttpUrl,
  validatePodcastRequest,
} from "./lib";

// ========================================
// SERVER ACTIONS (WITH AUTH)
// ========================================

// Server action: Fetch analyst podcasts with auth
export async function fetchAnalystPodcasts({
  analystId,
}: {
  analystId: number;
}): Promise<
  ServerActionResult<
    (Pick<
      AnalystPodcast,
      | "id"
      | "token"
      | "analystId"
      | "script"
      | "objectUrl"
      | "generatedAt"
      | "createdAt"
      | "updatedAt"
    > & { analyst: Analyst })[]
  >
> {
  return withAuth(async (user) => {
    try {
      const podcasts = await fetchPodcastsForAnalyst(analystId, user.id);
      return {
        success: true,
        data: podcasts,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("unauthorized") || errorMessage.includes("not found")) {
        return {
          success: false,
          code: "forbidden",
          message: "You are not authorized to access this resource.",
        };
      }
      return {
        success: false,
        message: errorMessage,
      };
    }
  });
}

// Server action: Generate podcast script with auth and background processing
export async function backgroundGeneratePodcast(params: PodcastGenerationParams): Promise<void> {
  return withAuth(async (user) => {
    // Verify the user owns the analyst
    const analyst = await prisma.analyst.findUnique({
      where: { id: params.analystId },
    });

    if (!analyst || analyst.userId !== user.id) {
      throw new Error("Analyst not found or unauthorized");
    }

    // Handle background processing at the server action level
    waitUntil(
      (async () => {
        try {
          await generatePodcastScript({
            analystId: params.analystId,
            instruction: params.instruction,
            systemPrompt: params.systemPrompt,
          });
        } catch (error) {
          // Log error but don't throw since this is background processing
          console.error("Background podcast script generation failed", {
            analystId: params.analystId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })(),
    );
  });
}

// Server action: Generate podcast audio with auth
export async function backgroundGeneratePodcastAudio(params: {
  podcastToken: string;
}): Promise<void> {
  return withAuth(async (user) => {
    const { podcastToken } = params;

    // Validate request and get podcast data
    const { podcast, locale } = await validatePodcastRequest(podcastToken, user.id);

    // Call the pure business logic function
    await generatePodcastAudio({
      podcastId: podcast.id,
      podcastToken: podcast.token,
      script: podcast.script,
      locale,
    });
  });
}

// Server action: Get signed URL for podcast audio
export async function getPodcastSignedUrl({
  podcastToken,
}: {
  podcastToken: string;
}): Promise<ServerActionResult<string | null>> {
  return withAuth(async (user) => {
    try {
      const podcast = await prisma.analystPodcast.findUnique({
        where: { token: podcastToken },
        include: {
          analyst: true,
        },
      });

      if (!podcast) {
        return {
          success: false,
          code: "not_found",
          message: "Podcast not found.",
        };
      }

      if (podcast.analyst.userId !== user.id) {
        return {
          success: false,
          code: "forbidden",
          message: "You are not authorized to access this resource.",
        };
      }

      const signedUrl = await podcastObjectUrlToHttpUrl(podcast);
      return {
        success: true,
        data: signedUrl,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

// ========================================
// BATCH PODCAST GENERATION (NO AUTH - FOR CRON JOBS)
// ========================================

// Server action: Batch generate podcasts for multiple analysts (no auth - called by cron)
export async function backgroundBatchGeneratePodcasts(
  params: {
    batchSize?: number;
    targetCount?: number;
    poolLimit?: number;
  } = {},
): Promise<void> {
  // This action is called by CronJob → API → Server Action
  // Authentication is handled at the API level using internal secret

  const { batchSize = 10, targetCount = 10, poolLimit = 10 } = params;

  // Use waitUntil for background processing - returns immediately
  waitUntil(
    (async () => {
      try {
        const { batchGeneratePodcasts } = await import("./lib");

        const result = await batchGeneratePodcasts({
          batchSize,
          targetCount,
          poolLimit,
        });

        console.log("Batch podcast generation completed", {
          totalProcessed: result.totalProcessed,
          successful: result.successful,
          failed: result.failed,
          processingTimeMs: result.summary.processingTimeMs,
        });
      } catch (error) {
        console.error("Batch podcast generation failed", {
          error: error instanceof Error ? error.message : String(error),
          params: { batchSize, targetCount, poolLimit },
        });
      }
    })(),
  );
}
