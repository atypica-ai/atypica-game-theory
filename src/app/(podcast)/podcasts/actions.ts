"use server";
import { podcastObjectUrlToHttpUrl } from "@/app/(podcast)/lib/utils";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

/**
 * Fetch all user's own podcasts across all analysts
 */
export async function fetchMyPodcasts(): Promise<
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
        studyUserChat: {
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
            studyUserChat: {
              select: {
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
 * Get signed URL for user's own podcast audio
 */
export async function getMyPodcastPlaybackUrl({
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

    const result = await podcastObjectUrlToHttpUrl(podcast);
    return {
      success: true,
      data: result ? result.signedObjectUrl : null,
    };
  });
}
