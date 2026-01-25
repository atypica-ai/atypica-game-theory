"use server";
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
    })[]
  >
> {
  return withAuth(async (user) => {
    const podcasts = await prisma.analystPodcast.findMany({
      where: {
        userId: user.id,
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
