"use server";
import { generatePodcastMetadata } from "@/app/(podcast)/lib/generation";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import {
  Analyst,
  AnalystPodcast,
  AnalystPodcastExtra,
  FeaturedItemExtra,
  FeaturedItemResourceType,
  User,
} from "@/prisma/client";
import { AnalystPodcastWhereInput } from "@/prisma/models";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { Locale } from "next-intl";
import { revalidatePath, revalidateTag } from "next/cache";
import { VALID_LOCALES } from "@/i18n/routing";

// Get all analyst podcasts with pagination
export async function fetchAnalystPodcastsAction(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
  featuredOnly?: boolean,
): Promise<
  ServerActionResult<
    (AnalystPodcast & {
      analyst: Analyst & {
        user: Pick<User, "email"> | null;
      };
      isFeatured?: boolean;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const skip = (page - 1) * pageSize;
  const where: AnalystPodcastWhereInput = searchQuery
    ? {
        OR: [
          { token: { contains: searchQuery } },
          { analyst: { topic: { contains: searchQuery } } },
          { analyst: { brief: { contains: searchQuery } } },
          { analyst: { user: { email: { contains: searchQuery } } } },
        ],
      }
    : {};

  // Get featured podcast IDs if featuredOnly filter is active
  if (featuredOnly) {
    const featuredItems = await prisma.featuredItem.findMany({
      where: {
        resourceType: FeaturedItemResourceType.AnalystPodcast,
      },
      select: {
        resourceId: true,
      },
    });
    const featuredPodcastIds = featuredItems.map((item) => item.resourceId);

    if (featuredPodcastIds.length === 0) {
      // No featured podcasts, return empty result
      return {
        success: true,
        data: [],
        pagination: {
          page,
          pageSize,
          totalCount: 0,
          totalPages: 0,
        },
      };
    }

    where.id = { in: featuredPodcastIds };
  }

  const analystPodcasts = await prisma.analystPodcast.findMany({
    where,
    include: {
      analyst: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
  });

  const totalCount = await prisma.analystPodcast.count({ where });

  // Check featured status for each podcast
  const podcastIds = analystPodcasts.map((p) => p.id);
  const featuredItems = await prisma.featuredItem.findMany({
    where: {
      resourceType: FeaturedItemResourceType.AnalystPodcast,
      resourceId: { in: podcastIds },
    },
  });
  const featuredPodcastIdsSet = new Set(featuredItems.map((item) => item.resourceId));

  return {
    success: true,
    data: analystPodcasts.map((podcast) => ({
      ...podcast,
      isFeatured: featuredPodcastIdsSet.has(podcast.id),
    })),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// Update podcast title
export async function updatePodcastTitleAction(
  podcastId: number,
  title: string,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const podcast = await prisma.analystPodcast.findUnique({
    where: { id: podcastId },
  });

  if (!podcast) {
    return {
      success: false,
      message: "Podcast not found",
      code: "not_found",
    };
  }

  try {
    await mergeExtra({
      tableName: "AnalystPodcast",
      id: podcastId,
      extra: {
        metadata: {
          ...(podcast.extra as AnalystPodcastExtra).metadata,
          title,
        },
      } satisfies Partial<AnalystPodcastExtra>,
    });

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error("Failed to update podcast title:", error);
    return {
      success: false,
      message: "Failed to update podcast title",
      code: "internal_server_error",
    };
  }
}

// Generate podcast metadata (title and show notes) using AI
export async function generatePodcastMetadataAction(
  podcastId: number,
): Promise<ServerActionResult<{ title: string; showNotes: string }>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const podcast = await prisma.analystPodcast.findUnique({
    where: { id: podcastId },
    include: {
      analyst: true,
    },
  });

  if (!podcast) {
    return {
      success: false,
      message: "Podcast not found",
      code: "not_found",
    };
  }

  if (!podcast.script) {
    return {
      success: false,
      message: "Podcast script not available",
      code: "not_found",
    };
  }

  try {
    // Detect locale from analyst brief or use default
    const locale = (await detectInputLanguage({ text: podcast.analyst.brief })) as Locale;

    const logger = rootLogger.child({
      podcastId: podcast.id,
      method: "generatePodcastTitleAction",
    });

    // Empty stat reporter and abort signal
    const statReport = async () => {};
    const abortSignal = new AbortController().signal;

    const { title, showNotes } = await generatePodcastMetadata({
      script: podcast.script,
      locale,
      abortSignal,
      statReport,
      logger,
    });

    // Update both title and showNotes in database
    await mergeExtra({
      tableName: "AnalystPodcast",
      id: podcastId,
      extra: {
        metadata: {
          ...(podcast.extra as AnalystPodcastExtra).metadata,
          title,
          showNotes,
        },
      } satisfies Partial<AnalystPodcastExtra>,
    });

    return {
      success: true,
      data: { title, showNotes },
    };
  } catch (error) {
    console.error("Failed to generate podcast metadata:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate podcast metadata",
      code: "internal_server_error",
    };
  }
}

// Toggle featured status for a podcast
export async function featurePodcastAction(podcastId: number): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const podcast = await prisma.analystPodcast.findUnique({
    where: { id: podcastId },
    include: {
      analyst: {
        select: {
          locale: true,
          kind: true,
        },
      },
    },
  });

  if (!podcast) {
    return {
      success: false,
      message: "Podcast not found",
      code: "not_found",
    };
  }

  // Check if analyst has valid locale
  if (!podcast.analyst.locale || !VALID_LOCALES.includes(podcast.analyst.locale as Locale)) {
    return {
      success: false,
      message: "Analyst locale is not valid. Cannot feature this podcast.",
      code: "forbidden",
    };
  }

  // Check if already featured
  const existingFeatured = await prisma.featuredItem.findFirst({
    where: {
      resourceType: FeaturedItemResourceType.AnalystPodcast,
      resourceId: podcastId,
    },
  });

  if (existingFeatured) {
    // Remove from featured
    await prisma.featuredItem.delete({
      where: { id: existingFeatured.id },
    });
  } else {
    // Add to featured - copy info from extra.metadata
    const extra = podcast.extra as AnalystPodcastExtra;
    const metadata = extra?.metadata;

    await prisma.featuredItem.create({
      data: {
        resourceType: FeaturedItemResourceType.AnalystPodcast,
        resourceId: podcastId,
        locale: podcast.analyst.locale as Locale,
        extra: {
          title: metadata?.title || "",
          description: metadata?.showNotes || "",
          coverObjectUrl: metadata?.coverObjectUrl || "",
          url: `/artifacts/podcast/${podcast.token}/share`,
          category: podcast.analyst.kind || undefined,
        } satisfies FeaturedItemExtra,
      },
    });
  }

  revalidatePath("/admin/studies/podcasts");
  revalidateTag("featured-podcasts");
  return {
    success: true,
    data: undefined,
  };
}
