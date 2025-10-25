"use server";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";

/**
 * Fetch featured podcasts from featured studies
 * For each featured study analyst, get the latest generated podcast
 */
export async function fetchFeaturedPodcasts({
  locale,
  limit = 20,
}: {
  locale?: Locale;
  limit?: number;
} = {}): Promise<
  ServerActionResult<
    {
      // Flattened fields
      podcast: {
        token: string;
        script: string | null;
        objectUrl: string | null;
        generatedAt: Date | null;
        createdAt: Date;
        extra: AnalystPodcastExtra;
      };
      analyst: {
        id: number;
        topic: string;
      };
      studyUserChat: {
        token: string;
        title: string;
      };
    }[]
  >
> {
  locale = locale || (await getLocale());

  // Get featured studies for the locale
  const featuredStudies = await prisma.featuredStudy.findMany({
    where: {
      analyst: { locale },
    },
    select: {
      analystId: true,
    },
    orderBy: {
      // displayOrder: "asc",
      id: "desc",
    },
    take: limit,
  });

  if (featuredStudies.length === 0) {
    return {
      success: true,
      data: [],
    };
  }

  const analystIds = featuredStudies.map((s) => s.analystId);

  // Fetch all podcasts for these analysts in one query
  const allPodcasts = await prisma.analystPodcast.findMany({
    where: {
      analystId: { in: analystIds },
      generatedAt: { not: null },
      analyst: {
        studyUserChat: { isNot: null },
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
              token: true,
              title: true,
            },
          },
        },
      },
    },
    // orderBy: { generatedAt: "desc" },
  });

  // Group by analystId and take the latest one for each
  const podcastsByAnalyst = new Map<number, (typeof allPodcasts)[number]>();
  for (const podcast of allPodcasts) {
    if (!podcastsByAnalyst.has(podcast.analystId)) {
      podcastsByAnalyst.set(podcast.analystId, podcast);
    }
  }

  // Get podcasts in the order of featured studies
  type ValidPodcast = NonNullable<(typeof allPodcasts)[number]> & {
    analyst: {
      id: number;
      topic: string;
      studyUserChat: {
        token: string;
        title: string;
      };
    };
  };

  const validPodcasts = analystIds
    .map((id) => podcastsByAnalyst.get(id))
    .filter((p): p is ValidPodcast => p !== undefined && p.analyst.studyUserChat !== null);

  return {
    success: true,
    data: validPodcasts.map((p) => ({
      // Flatten the three key objects
      podcast: {
        token: p.token,
        script: p.script,
        objectUrl: p.objectUrl,
        generatedAt: p.generatedAt,
        createdAt: p.createdAt,
        extra: (p.extra || {}) as AnalystPodcastExtra,
      },
      analyst: {
        id: p.analyst.id,
        topic: p.analyst.topic,
      },
      studyUserChat: p.analyst.studyUserChat,
    })),
  };
}
