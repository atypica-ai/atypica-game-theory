"use server";

import { StatReporter } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { determineKindAndGeneratePodcast } from "./lib/evaluate";
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
    const podcasts = await prisma.analystPodcast.findMany({
      where: {
        analystId,
        analyst: { userId: user.id },
      },
      select: {
        id: true,
        token: true,
        analystId: true,
        analyst: true,
        script: true,
        objectUrl: true,
        generatedAt: true,
        createdAt: true,
        updatedAt: true,
        extra: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      success: true,
      data: podcasts.map((podcast) => ({
        ...podcast,
        extra: (podcast.extra || {}) as AnalystPodcastExtra,
      })),
    };
  });
}

// Server action: Generate complete podcast (script + audio) with auth and background processing
export async function determineKindAndGeneratePodcastAction({
  analystId,
}: {
  analystId: number;
}): Promise<void> {
  return withAuth(async (user) => {
    // Verify the user owns the analyst
    const analyst = await prisma.analyst.findUnique({
      where: { id: analystId },
    });

    if (!analyst || analyst.userId !== user.id) {
      throw new Error("Analyst not found or unauthorized");
    }

    // Mock stat reporter for limited free podcast generation
    const statReport: StatReporter = async (dimension, value, extra) => {
      rootLogger.info({
        msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
        extra,
        analystId: analystId,
        note: "Podcast generation is currently free - tokens not deducted",
      });
    };

    // Handle background processing at the server action level
    const abortController = new AbortController();
    const abortSignal = abortController.signal;

    waitUntil(
      determineKindAndGeneratePodcast({
        analystId: analystId,
        abortSignal,
        statReport,
      }),
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
