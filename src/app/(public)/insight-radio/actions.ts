"use server";
import { proxiedImageCdnUrl } from "@/app/(system)/cdn/lib";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystPodcastExtra, FeaturedItemExtra, FeaturedItemResourceType } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { unstable_cache } from "next/cache";

type FeaturedPodcastResult = {
  id: number;
  token: string;
  title: string;
  description: string;
  coverUrl: string | null;
  url: string;
  objectUrl: string | null;
  script: string | null;
  generatedAt: Date;
  extra: AnalystPodcastExtra;
  kindDetermination?: {
    kind: "deepDive" | "opinionOriented" | "fastInsight" | "debate";
    reason: string;
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
        generatedAt: true,
        extra: true,
      },
    });

    if (!podcast || !podcast.generatedAt) {
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
        token: podcast.token,
        title: extra.title || "",
        description: extra.description || "",
        coverUrl: extra.coverObjectUrl
          ? proxiedImageCdnUrl({ objectUrl: extra.coverObjectUrl })
          : null,
        url: extra.url || "",
        objectUrl: podcast.objectUrl,
        script: podcast.script,
        generatedAt: podcast.generatedAt,
        extra: podcastExtra,
        kindDetermination: podcastExtra?.kindDetermination,
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
        generatedAt: { not: null },
      },
      select: {
        id: true,
        token: true,
        objectUrl: true,
        script: true,
        generatedAt: true,
        extra: true,
      },
    });

    // Create map for efficient lookup
    const podcastMap = new Map(podcasts.map((p) => [p.id, p]));

    // Combine data
    const data = featuredItems
      .map((item) => {
        const podcast = podcastMap.get(item.resourceId);
        if (!podcast || !podcast.generatedAt) return null;

        const extra = (item.extra as FeaturedItemExtra) || {};
        const podcastExtra = (podcast.extra as AnalystPodcastExtra) || {};

        return {
          id: item.id,
          token: podcast.token,
          title: extra.title || "",
          description: extra.description || "",
          coverUrl: extra.coverObjectUrl
            ? proxiedImageCdnUrl({ objectUrl: extra.coverObjectUrl })
            : null,
          url: extra.url || "",
          objectUrl: podcast.objectUrl,
          script: podcast.script,
          generatedAt: podcast.generatedAt,
          extra: podcastExtra,
          kindDetermination: podcastExtra?.kindDetermination,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

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
