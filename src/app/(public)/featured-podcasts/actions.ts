"use server";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { unstable_cache } from "next/cache";

/**
 * Pick a random featured podcast
 * Single query: get all podcasts from featured studies, then pick random
 */
export const pickRandomFeaturedPodcast = unstable_cache(
  async function ({ locale }: { locale: Locale }): Promise<
    ServerActionResult<{
      podcast: {
        token: string;
        script: string | null;
        objectUrl: string | null;
        generatedAt: Date;
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
    } | null>
  > {
    // Single query: get all podcasts from featured studies with the locale
    const podcasts = await prisma.analystPodcast.findMany({
      where: {
        generatedAt: { not: null },
        analyst: {
          locale,
          studyUserChat: { isNot: null },
          featuredStudy: { isNot: null }, // Must be in featured studies
        },
      },
      select: {
        token: true,
        script: true,
        objectUrl: true,
        generatedAt: true,
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
    });

    if (podcasts.length === 0) {
      return {
        success: true,
        data: null,
      };
    }

    // Pick a random podcast in memory (dataset is small)
    const randomIndex = Math.floor(Math.random() * podcasts.length);
    const podcast = podcasts[randomIndex];

    if (!podcast.analyst.studyUserChat) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        podcast: {
          token: podcast.token,
          script: podcast.script,
          objectUrl: podcast.objectUrl,
          generatedAt: podcast.generatedAt!,
          extra: (podcast.extra || {}) as AnalystPodcastExtra,
        },
        analyst: {
          id: podcast.analyst.id,
          topic: podcast.analyst.topic,
        },
        studyUserChat: podcast.analyst.studyUserChat,
      },
    };
  },
  ["random-featured-podcast"],
  {
    revalidate: 600, // 10分钟缓存
  },
);

/**
 * Fetch featured podcasts from featured studies
 * Single query with proper filtering
 */
export const fetchFeaturedPodcasts = unstable_cache(
  async function ({ locale, limit = 20 }: { locale: Locale; limit?: number }): Promise<
    ServerActionResult<
      {
        // Flattened fields
        podcast: {
          token: string;
          script: string | null;
          objectUrl: string | null;
          generatedAt: Date;
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
    // Single query: get podcasts with featured studies, group by analyst
    const allPodcasts = await prisma.analystPodcast.findMany({
      where: {
        generatedAt: { not: null },
        analyst: {
          locale,
          studyUserChat: { isNot: null },
          featuredStudy: { isNot: null }, // Must be in featured studies
        },
      },
      select: {
        id: true,
        token: true,
        analystId: true,
        script: true,
        objectUrl: true,
        generatedAt: true,
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
            featuredStudy: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        generatedAt: "desc",
      },
    });

    // Group by analystId and take the latest one for each
    const podcastsByAnalyst = new Map<number, (typeof allPodcasts)[number]>();
    for (const podcast of allPodcasts) {
      const existing = podcastsByAnalyst.get(podcast.analystId);
      if (!existing) {
        podcastsByAnalyst.set(podcast.analystId, podcast);
      } else if (
        podcast.generatedAt &&
        (!existing.generatedAt || podcast.generatedAt > existing.generatedAt)
      ) {
        podcastsByAnalyst.set(podcast.analystId, podcast);
      }
    }

    // Convert to array and sort by featured study order
    const validPodcasts = Array.from(podcastsByAnalyst.values())
      .filter((p) => p.analyst.studyUserChat !== null && p.analyst.featuredStudy !== null)
      .sort((a, b) => {
        // Sort by featured study id (desc)
        const aId = a.analyst.featuredStudy?.id || 0;
        const bId = b.analyst.featuredStudy?.id || 0;
        return bId - aId;
      })
      .slice(0, limit);

    return {
      success: true,
      data: validPodcasts.map((p) => ({
        // Flatten the three key objects
        podcast: {
          token: p.token,
          script: p.script,
          objectUrl: p.objectUrl,
          generatedAt: p.generatedAt!,
          extra: (p.extra || {}) as AnalystPodcastExtra,
        },
        analyst: {
          id: p.analyst.id,
          topic: p.analyst.topic,
        },
        studyUserChat: p.analyst.studyUserChat!,
      })),
    };
  },
  ["featured-podcasts"],
  {
    tags: ["featured-podcasts"],
    revalidate: 600, // 10分钟缓存
  },
);
