"use server";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystPodcastExtra } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
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
    const podcasts = await prismaRO.analystPodcast.findMany({
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
  async function ({
    locale,
    page = 1,
    pageSize = 20,
  }: {
    locale: Locale;
    page?: number;
    pageSize?: number;
  }): Promise<
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
    const skip = (page - 1) * pageSize;

    // Step 1: Direct database pagination on podcasts
    // Note: One analyst may have multiple podcasts, so pagination count may not be exact
    // But most analysts only have one podcast, so this is acceptable
    const [podcasts, totalCount] = await Promise.all([
      prismaRO.analystPodcast.findMany({
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
            },
          },
        },
        orderBy: {
          generatedAt: "desc",
        },
        skip,
        take: pageSize,
      }),
      prismaRO.analystPodcast.count({
        where: {
          generatedAt: { not: null },
          analyst: {
            locale,
            studyUserChat: { isNot: null },
            featuredStudy: { isNot: null },
          },
        },
      }),
    ]);

    // Filter out podcasts with missing relations
    const validPodcasts = podcasts.filter((p) => p.analyst.studyUserChat !== null);

    // Step 3: Combine data
    return {
      success: true,
      data: validPodcasts.map((p) => ({
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
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  },
  ["featured-podcasts"],
  {
    tags: ["featured-podcasts"],
    revalidate: 600, // 10分钟缓存
  },
);
