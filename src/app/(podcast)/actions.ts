"use server";

import { StatReporter } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { fetchPodcastsForAnalyst } from "./lib/data";
import { generatePodcast } from "./lib/generation";
import { podcastObjectUrlToHttpUrl } from "./lib/utils";

// ========================================
// SERVER ACTIONS (WITH AUTH)
// ========================================

// Server action: Fetch analyst podcasts with auth
export async function fetchAnalystPodcasts({ analystId }: { analystId: number }): Promise<
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
    > & {
      analyst: Analyst;
      extra: AnalystPodcastExtra;
    })[]
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

// Server action: Generate complete podcast (script + audio) with auth and background processing
export async function generatePodcastAction(params: {
  analystId: number;
  instruction?: string;
  systemPrompt?: string;
}): Promise<void> {
  return withAuth(async (user) => {
    // Verify the user owns the analyst
    const analyst = await prisma.analyst.findUnique({
      where: { id: params.analystId },
    });

    if (!analyst || analyst.userId !== user.id) {
      throw new Error("Analyst not found or unauthorized");
    }

    // Mock stat reporter for limited free podcast generation
    const statReport: StatReporter = async (dimension, value, extra) => {
      rootLogger.info({
        msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
        extra,
        analystId: params.analystId,
        note: "Podcast generation is currently free - tokens not deducted",
      });
    };

    // Handle background processing at the server action level
    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    waitUntil(
      (async () => {
        try {
          await generatePodcast({
            analystId: params.analystId,
            instruction: params.instruction,
            systemPrompt: params.systemPrompt,
            abortSignal,
            statReport,
          });
        } catch (error) {
          // Log error but don't throw since this is background processing
          rootLogger.error({
            msg: "Background podcast generation failed",
            analystId: params.analystId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })(),
    );
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
