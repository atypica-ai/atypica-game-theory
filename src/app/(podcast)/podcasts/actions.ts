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
      analyst: {
        id: number;
        topic: string;
        studyUserChat: {
          title: string;
          token: string;
        };
      };
    })[]
  >
> {
  return withAuth(async (user) => {
    const podcasts = await prisma.analystPodcast.findMany({
      where: {
        analyst: {
          userId: user.id,
          studyUserChatId: { not: null },
        },
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
                token: true,
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
        analyst: {
          ...podcast.analyst,
          studyUserChat: {
            title: podcast.analyst.studyUserChat?.title || "",
            token: podcast.analyst.studyUserChat?.token || "",
          },
        },
      })),
    };
  });
}
