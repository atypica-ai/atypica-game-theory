"use server";
import { generatePodcastCoverImage } from "@/app/(podcast)/lib/coverImage";
import { generatePodcastMetadata } from "@/app/(podcast)/lib/generation";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import {
  AnalystPodcast,
  AnalystPodcastExtra,
  FeaturedItemExtra,
  FeaturedItemResourceType,
  User,
} from "@/prisma/client";
import { AnalystPodcastWhereInput } from "@/prisma/models";
import { prisma, prismaRO } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { waitUntil } from "@vercel/functions";
import { revalidatePath, revalidateTag } from "next/cache";

// Get all analyst podcasts with pagination
export async function fetchAnalystPodcastsAction(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
  featuredOnly?: boolean,
): Promise<
  ServerActionResult<
    (AnalystPodcast & {
      user: Pick<User, "email"> | null;
      isFeatured?: boolean;
      tags?: string;
      coverCdnHttpUrl?: string;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const skip = (page - 1) * pageSize;
  const where: AnalystPodcastWhereInput = searchQuery
    ? {
        OR: [
          { token: { contains: searchQuery } },
          { user: { email: { contains: searchQuery } } },
          // 目前暂时不支持关键词搜索，得改成 raw sql 搜索 extra 中的 title
        ],
      }
    : {};

  // Get featured podcast IDs if featuredOnly filter is active
  if (featuredOnly) {
    const featuredItems = await prismaRO.featuredItem.findMany({
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

  const analystPodcasts = await prismaRO.analystPodcast.findMany({
    where,
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
  });

  const totalCount = await prismaRO.analystPodcast.count({ where });

  // Check featured status for each podcast and get tags
  const podcastIds = analystPodcasts.map((p) => p.id);
  const featuredItems = await prismaRO.featuredItem.findMany({
    where: {
      resourceType: FeaturedItemResourceType.AnalystPodcast,
      resourceId: { in: podcastIds },
    },
  });
  const featuredItemsMap = new Map(
    featuredItems.map((item) => [
      item.resourceId,
      {
        isFeatured: true,
        tags: ((item.extra as FeaturedItemExtra) || {}).tags || "",
      },
    ]),
  );

  // Get cover CDN URLs for all podcasts
  const podcastsWithCovers = await Promise.all(
    analystPodcasts.map(async (podcast) => {
      const extra = podcast.extra as AnalystPodcastExtra;
      const coverObjectUrl = extra?.metadata?.coverObjectUrl;
      const coverCdnHttpUrl = coverObjectUrl ? await getS3SignedCdnUrl(coverObjectUrl) : undefined;

      const featuredInfo = featuredItemsMap.get(podcast.id);
      return {
        ...podcast,
        isFeatured: featuredInfo?.isFeatured || false,
        tags: featuredInfo?.tags || "",
        coverCdnHttpUrl,
      };
    }),
  );

  return {
    success: true,
    data: podcastsWithCovers,
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
    // Detect locale from script
    const locale = await detectInputLanguage({
      text: podcast.script,
    });

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
  });

  if (!podcast) {
    return {
      success: false,
      message: "Podcast not found",
      code: "not_found",
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
    const locale = await detectInputLanguage({
      text: podcast.script,
    });

    await prisma.featuredItem.create({
      data: {
        resourceType: FeaturedItemResourceType.AnalystPodcast,
        resourceId: podcastId,
        locale,
        extra: {
          title: metadata?.title || "",
          description: metadata?.showNotes || "",
          coverObjectUrl: metadata?.coverObjectUrl || "",
          url: `/artifacts/podcast/${podcast.token}/share`,
          // category: podcast.analyst.kind || undefined, // 保留字段但不使用
          // tags: podcast.analyst.kind || "", // 默认写入 kind 作为 tags
        } satisfies FeaturedItemExtra,
      },
    });
  }

  revalidatePath("/admin/studies/podcasts");
  revalidateTag("public-featured-items");
  revalidateTag("featured-podcasts");
  return {
    success: true,
    data: undefined,
  };
}

// Update tags for a featured podcast
export async function updateFeaturedItemTagsAction(
  podcastId: number,
  tags: string,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  // Find the featured item for this podcast
  const featuredItem = await prisma.featuredItem.findFirst({
    where: {
      resourceType: FeaturedItemResourceType.AnalystPodcast,
      resourceId: podcastId,
    },
  });

  if (!featuredItem) {
    return {
      success: false,
      message: "Podcast is not featured",
      code: "not_found",
    };
  }

  // Update the extra field with tags
  const currentExtra = (featuredItem.extra as FeaturedItemExtra) || {};
  await prisma.featuredItem.update({
    where: { id: featuredItem.id },
    data: {
      extra: {
        ...currentExtra,
        tags,
      } satisfies FeaturedItemExtra,
    },
  });

  revalidatePath("/admin/studies/podcasts");
  revalidateTag("featured-podcasts");
  return {
    success: true,
    data: undefined,
  };
}

// Generate cover image for a podcast
export async function adminGeneratePodcastCoverAction(
  podcastId: number,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const podcast = (await prisma.analystPodcast.findUniqueOrThrow({
    where: { id: podcastId },
    select: {
      id: true,
      token: true,
      script: true,
    },
  })) as Pick<AnalystPodcast, "id" | "token" | "script"> & {
    //
  };

  if (!podcast.script) {
    return {
      success: false,
      message: "Podcast script not available",
      code: "not_found",
    };
  }

  // ⚠️ 重新生成封面的时候，直接使用 report 上的 description
  const studyLog = podcast.script;
  const locale = await detectInputLanguage({ text: studyLog });

  // Empty stat reporter for admin (free generation)
  const statReport = async () => {};
  const abortSignal = AbortSignal.timeout(300_000); // 5 minutes timeout

  waitUntil(
    generatePodcastCoverImage({
      ratio: "landscape",
      studyLog,
      podcast,
      locale,
      abortSignal,
      statReport,
      logger: rootLogger.child({ podcastId }),
    }).catch(() => {}),
  );

  revalidatePath("/admin/studies/podcasts");
  return {
    success: true,
    data: undefined,
  };
}
