"use server";

import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { 
  fetchPodcastsForAnalyst, 
  generatePodcastScriptForAnalyst,
  generatePodcastAudio,
  validatePodcastRequest,
  PodcastGenerationParams 
} from "./lib";

// ========================================
// SERVER ACTIONS (WITH AUTH)
// ========================================

// Server action: Fetch analyst podcasts with auth
export async function fetchAnalystPodcasts({ analystId }: { analystId: number }): Promise<
  ServerActionResult<
    (Pick<
      import("@/prisma/client").AnalystPodcast,
      "id" | "token" | "analystId" | "script" | "podcastUrl" | "generatedAt" | "createdAt" | "updatedAt"
    > & { analyst: import("@/prisma/client").Analyst })[]
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

// Server action: Generate podcast script with auth
export async function backgroundGeneratePodcast(params: PodcastGenerationParams): Promise<void> {
  return withAuth(async (user) => {
    // Verify the user owns the analyst
    const analyst = await prisma.analyst.findUnique({
      where: { id: params.analystId },
    });
    
    if (!analyst || analyst.userId !== user.id) {
      throw new Error("Analyst not found or unauthorized");
    }
    
    await generatePodcastScriptForAnalyst(params);
  });
}

// Server action: Generate podcast audio with auth
export async function backgroundGeneratePodcastAudio(params: { podcastToken: string }): Promise<void> {
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