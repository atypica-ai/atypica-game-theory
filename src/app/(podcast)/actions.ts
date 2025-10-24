"use server";

import { initStudyStatReporter } from "@/ai/tools/stats";
import { rootLogger } from "@/lib/logging";
import { getDeployRegion } from "@/lib/request/deployRegion";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { proxiedObjectCdnUrl } from "../(system)/cdn/lib";
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

    if (!analyst.studyUserChatId) {
      throw new Error("Analyst not associated with a study user chat");
    }

    // Mock stat reporter for limited free podcast generation
    // const statReport: StatReporter = async (dimension, value, extra) => {
    //   rootLogger.info({
    //     msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
    //     extra,
    //     analystId: analystId,
    //     note: "Podcast generation is currently free - tokens not deducted",
    //   });
    // };
    const { statReport } = initStudyStatReporter({
      userId: user.id,
      studyUserChatId: analyst.studyUserChatId,
      logger: rootLogger.child({ analystId, studyUserChatId: analyst.studyUserChatId }),
    });

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
// No auth required - podcast token itself serves as authorization
export async function getPodcastAudioSignedUrl({
  podcastToken,
}: {
  podcastToken: string;
}): Promise<ServerActionResult<string | null>> {
  const podcast = await prisma.analystPodcast.findUnique({
    where: { token: podcastToken },
    select: {
      id: true,
      objectUrl: true,
      extra: true,
      generatedAt: true,
    },
  });

  if (!podcast || !podcast.generatedAt || !podcast.objectUrl) {
    return {
      success: false,
      code: "not_found",
      message: "Podcast audio not found.",
    };
  }

  const result = await podcastObjectUrlToHttpUrl(podcast);
  if (!result) {
    return {
      success: true,
      data: null,
    };
  }

  const { signedObjectUrl, mimeType } = result;

  if (
    true || // 国内和海外都用 CDN
    (getDeployRegion() === "mainland" && !/amazonaws\.com\.cn/.test(signedObjectUrl))
  ) {
    return {
      success: true,
      data: proxiedObjectCdnUrl({
        objectUrl: signedObjectUrl,
        mimeType,
      }),
    };
  } else {
    return {
      success: true,
      data: signedObjectUrl,
    };
  }
}
