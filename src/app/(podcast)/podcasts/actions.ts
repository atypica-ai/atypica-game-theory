"use server";

import { podcastObjectUrlToHttpUrl } from "@/app/(podcast)/lib/utils";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

/**
 * Fetch all user's podcasts across all analysts
 */
export async function fetchUserPodcasts(): Promise<
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
      extra: AnalystPodcastExtra;
      analyst: {
        id: number;
        topic: string;
        studyUserChatId: number | null;
        studyUserChat: {
          token: string;
          title: string;
        } | null;
      };
    })[]
  >
> {
  return withAuth(async (user) => {
    const podcasts = await prisma.analystPodcast.findMany({
      where: {
        analyst: { userId: user.id },
        generatedAt: { not: null }, // Only show completed podcasts
      },
      select: {
        id: true,
        token: true,
        analystId: true,
        script: true,
        objectUrl: true,
        generatedAt: true,
        createdAt: true,
        updatedAt: true,
        extra: true,
        analyst: {
          select: {
            id: true,
            topic: true,
            studyUserChatId: true,
            studyUserChat: {
              select: {
                token: true,
                title: true,
              },
            },
          },
        },
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

/**
 * Get signed URL for podcast audio
 */
export async function getPodcastPlaybackUrl({
  podcastToken,
}: {
  podcastToken: string;
}): Promise<ServerActionResult<string | null>> {
  return withAuth(async (user) => {
    const podcast = await prisma.analystPodcast.findFirst({
      where: {
        token: podcastToken,
        analyst: { userId: user.id },
      },
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

    const signedUrl = await podcastObjectUrlToHttpUrl(podcast);
    return {
      success: true,
      data: signedUrl,
    };
  });
}

