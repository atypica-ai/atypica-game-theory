"use server";
import { generatePodcastCoverImage } from "@/app/(podcast)/lib/coverImage";
import { generatePodcastMetadata } from "@/app/(podcast)/lib/generation";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { s3SignedCdnUrl } from "@/lib/attachments/s3";
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
import { searchArtifacts as searchArtifactsFromMeili } from "@/search/lib/queries";
import { syncPodcast as syncPodcastToMeili } from "@/search/lib/sync";
import { waitUntil } from "@vercel/functions";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * 判断是否是 token（16位字母数字）
 */
function isToken(query: string): boolean {
  return /^[a-zA-Z0-9]{16}$/.test(query);
}

/**
 * 判断是否是 email
 */
function isEmail(query: string): boolean {
  return query.includes("@");
}

/**
 * 从 slug 提取 ID（格式：podcast-123）
 */
function extractIdFromSlug(slug: string): number {
  const match = slug.match(/^podcast-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

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
  let where: AnalystPodcastWhereInput = {};
  let totalCount = 0;
  let orderedIds: number[] | null = null; // Meilisearch 返回的有序 IDs
  let useDatabasePagination = true; // 是否使用数据库分页

  // 搜索逻辑
  if (searchQuery) {
    const trimmedQuery = searchQuery.trim();

    if (isToken(trimmedQuery)) {
      // Token 搜索：精确匹配
      where = { token: trimmedQuery };
    } else if (isEmail(trimmedQuery)) {
      // Email 搜索：精确匹配
      where = { user: { email: trimmedQuery } };
    } else if (trimmedQuery) {
      // 关键词搜索：使用 Meilisearch
      try {
        const searchResults = await searchArtifactsFromMeili({
          query: trimmedQuery,
          type: "podcast",
          isFeatured: featuredOnly ? true : undefined, // 如果需要 featured only，在 Meilisearch 直接过滤
          page,
          pageSize,
        });

        if (searchResults.hits.length === 0) {
          // Meilisearch 无结果，返回空
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

        // 从 slugs 提取 IDs
        orderedIds = searchResults.hits.map((hit) => extractIdFromSlug(hit.slug));
        where = { id: { in: orderedIds } };
        totalCount = searchResults.totalHits;
        useDatabasePagination = false; // Meilisearch 已经分页
      } catch (error) {
        rootLogger.error({
          msg: "Meilisearch search failed",
          error: error instanceof Error ? error.message : String(error),
        });
        // Meilisearch 失败，返回空结果
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
    }
  }

  // Get featured podcast IDs if featuredOnly filter is active
  // Note: 对于 Meilisearch 搜索，已经在上面通过 isFeatured 参数过滤了，这里只处理 token/email 搜索
  if (featuredOnly && useDatabasePagination) {
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

    // Merge with existing where condition
    if (
      where.id &&
      typeof where.id === "object" &&
      "in" in where.id &&
      Array.isArray(where.id.in)
    ) {
      // If already have IDs, intersect with featured IDs (should not happen for Meilisearch path)
      const existingIds = where.id.in;
      where.id = { in: existingIds.filter((id) => featuredPodcastIds.includes(id)) };
    } else {
      where.id = { in: featuredPodcastIds };
    }
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
    orderBy: useDatabasePagination ? { createdAt: "desc" } : undefined,
    skip: useDatabasePagination ? skip : undefined,
    take: useDatabasePagination ? pageSize : undefined,
  });

  // 如果使用数据库分页，需要计算 totalCount
  if (useDatabasePagination) {
    totalCount = await prismaRO.analystPodcast.count({ where });
  }

  // 如果是 Meilisearch 搜索，按照返回的顺序排序
  let sortedPodcasts = analystPodcasts;
  if (orderedIds) {
    const idToPodcast = new Map(analystPodcasts.map((p) => [p.id, p]));
    sortedPodcasts = orderedIds
      .map((id) => idToPodcast.get(id))
      .filter((p): p is (typeof analystPodcasts)[0] => p !== undefined);
  }

  // Check featured status for each podcast and get tags
  const podcastIds = sortedPodcasts.map((p) => p.id);
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
    sortedPodcasts.map(async (podcast) => {
      const extra = podcast.extra;
      const coverObjectUrl = extra?.metadata?.coverObjectUrl;
      const coverCdnHttpUrl = coverObjectUrl ? await s3SignedCdnUrl(coverObjectUrl) : undefined;

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
          ...podcast.extra.metadata,
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
          ...podcast.extra.metadata,
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
    const extra = podcast.extra;
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

  // 同步更新 Meilisearch 中的 isFeatured 状态
  waitUntil(
    syncPodcastToMeili(podcastId).catch((error) => {
      rootLogger.error({
        msg: "Failed to sync podcast featured status to search",
        podcastId,
        error: error instanceof Error ? error.message : String(error),
      });
    }),
  );

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
