"use server";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystPodcastExtra, FeaturedItemExtra, FeaturedItemResourceType } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { unstable_cache } from "next/cache";

type FeaturedPodcastResult = {
  id: number;
  createdAt: Date;
  title: string;
  description: string;
  coverUrl: string | null;
  url: string;
  category?: string;
  podcast: {
    token: string;
    objectUrl: string | null;
    script: string | null;
    extra: AnalystPodcastExtra;
  };
};

/**
 * Pick a random featured podcast
 * Fetches from FeaturedItem, then gets full podcast details
 */
export const pickRandomFeaturedPodcast = unstable_cache(
  async function ({
    locale,
  }: {
    locale: Locale;
  }): Promise<ServerActionResult<FeaturedPodcastResult | null>> {
    // Get all featured podcast items
    const featuredItems = await prismaRO.featuredItem.findMany({
      where: {
        resourceType: FeaturedItemResourceType.AnalystPodcast,
        locale,
      },
      select: {
        id: true,
        resourceId: true,
        extra: true,
        createdAt: true,
      },
    });

    if (featuredItems.length === 0) {
      return {
        success: true,
        data: null,
      };
    }

    // Pick random in memory
    const randomItem = featuredItems[Math.floor(Math.random() * featuredItems.length)];

    // Fetch podcast details
    const podcast = await prismaRO.analystPodcast.findUnique({
      where: { id: randomItem.resourceId },
      select: {
        token: true,
        objectUrl: true,
        script: true,
        extra: true,
      },
    });

    if (!podcast) {
      return {
        success: true,
        data: null,
      };
    }

    const extra = (randomItem.extra as FeaturedItemExtra) || {};
    const podcastExtra = (podcast.extra as AnalystPodcastExtra) || {};

    return {
      success: true,
      data: {
        id: randomItem.id,
        createdAt: randomItem.createdAt,
        title: extra.title || "",
        description: extra.description || "",
        coverUrl: extra.coverObjectUrl ? await getS3SignedCdnUrl(extra.coverObjectUrl) : null,
        url: extra.url || "",
        category: extra.category,
        podcast: {
          token: podcast.token,
          objectUrl: podcast.objectUrl,
          script: podcast.script,
          extra: podcastExtra,
        },
      },
    };
  },
  ["random-featured-podcast"],
  {
    revalidate: 600, // 10分钟缓存
  },
);

/**
 * Fetch featured podcasts from FeaturedItem
 * Batch joins with AnalystPodcast for additional data
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
  }): Promise<ServerActionResult<FeaturedPodcastResult[]>> {
    const skip = (page - 1) * pageSize;

    // Fetch featured items with pagination
    const [featuredItems, totalCount] = await Promise.all([
      prismaRO.featuredItem.findMany({
        where: {
          resourceType: FeaturedItemResourceType.AnalystPodcast,
          locale,
        },
        select: {
          id: true,
          resourceId: true,
          extra: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prismaRO.featuredItem.count({
        where: {
          resourceType: FeaturedItemResourceType.AnalystPodcast,
          locale,
        },
      }),
    ]);

    // Batch fetch podcast details
    const podcastIds = featuredItems.map((item) => item.resourceId);
    const podcasts = await prismaRO.analystPodcast.findMany({
      where: {
        id: { in: podcastIds },
      },
      select: {
        id: true,
        token: true,
        objectUrl: true,
        script: true,
        extra: true,
      },
    });

    // Create map for efficient lookup
    const podcastMap = new Map(podcasts.map((p) => [p.id, p]));

    // Combine data
    const data = (
      await Promise.all(
        featuredItems.map(async (item) => {
          const podcast = podcastMap.get(item.resourceId);
          if (!podcast) return null;
          const extra = (item.extra as FeaturedItemExtra) || {};
          const podcastExtra = (podcast.extra as AnalystPodcastExtra) || {};
          return {
            id: item.id,
            createdAt: item.createdAt,
            title: extra.title || "",
            description: extra.description || "",
            coverUrl: extra.coverObjectUrl ? await getS3SignedCdnUrl(extra.coverObjectUrl) : null,
            url: extra.url || "",
            category: extra.category,
            podcast: {
              token: podcast.token,
              objectUrl: podcast.objectUrl,
              script: podcast.script,
              extra: podcastExtra,
            },
          };
        }),
      )
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      success: true,
      data,
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
