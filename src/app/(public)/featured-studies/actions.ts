"use server";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystKind, FeaturedItemExtra, FeaturedItemResourceType } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";

type FeaturedReportResult = {
  id: number;
  createdAt: Date;
  title: string;
  description: string;
  coverUrl: string | null;
  url: string;
  category: AnalystKind;
};

// Internal implementation of fetchPublicFeaturedReports
async function _fetchPublicFeaturedReportsImpl({
  locale,
  tag,
  limit,
  random,
}: {
  locale: Locale;
  tag?: string | "all";
  limit?: number;
  random?: boolean;
}): Promise<FeaturedReportResult[]> {
  let featuredItems: Array<{
    id: number;
    resourceType: FeaturedItemResourceType;
    resourceId: number;
    extra: unknown;
    createdAt: Date;
  }>;

  if (random && limit) {
    // Random selection with tag filter
    if (tag && tag !== "all") {
      // Use raw SQL with LIKE to check if tags contains the specified tag
      const result = (await prismaRO.$queryRaw`
        SELECT id FROM "FeaturedItem"
        WHERE "resourceType" = ${FeaturedItemResourceType.AnalystReport}
        AND locale = ${locale}
        AND (
          extra->>'tags' LIKE ${"%" + tag + "%"}
        )
        ORDER BY RANDOM()
        LIMIT ${limit}
      `) as { id: number }[];

      const itemIds = result.map((r) => r.id);

      if (itemIds.length > 0) {
        const items = await prismaRO.featuredItem.findMany({
          where: { id: { in: itemIds } },
          select: {
            id: true,
            resourceType: true,
            resourceId: true,
            extra: true,
            createdAt: true,
          },
        });

        // Maintain random order from raw query
        const itemMap = new Map(items.map((i) => [i.id, i]));
        featuredItems = itemIds
          .map((id) => itemMap.get(id))
          .filter((i): i is NonNullable<typeof i> => i != null) as typeof featuredItems;
      } else {
        featuredItems = [];
      }
    } else {
      // Random without tag filter
      const result = (await prismaRO.$queryRaw`
        SELECT id FROM "FeaturedItem"
        WHERE "resourceType" = ${FeaturedItemResourceType.AnalystReport}
        AND locale = ${locale}
        ORDER BY RANDOM()
        LIMIT ${limit}
      `) as { id: number }[];

      const itemIds = result.map((r) => r.id);

      if (itemIds.length > 0) {
        const items = await prismaRO.featuredItem.findMany({
          where: { id: { in: itemIds } },
          select: {
            id: true,
            resourceType: true,
            resourceId: true,
            extra: true,
            createdAt: true,
          },
        });

        const itemMap = new Map(items.map((i) => [i.id, i]));
        featuredItems = itemIds
          .map((id) => itemMap.get(id))
          .filter((i): i is NonNullable<typeof i> => i != null) as typeof featuredItems;
      } else {
        featuredItems = [];
      }
    }
  } else {
    // Fetch all and filter in memory (acceptable for small dataset)
    const allItems = await prismaRO.featuredItem.findMany({
      where: {
        resourceType: FeaturedItemResourceType.AnalystReport,
        locale,
      },
      select: {
        id: true,
        resourceType: true,
        resourceId: true,
        extra: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by tag if specified
    if (tag && tag !== "all") {
      featuredItems = allItems.filter((item) => {
        const extra = item.extra as FeaturedItemExtra;
        const tags = extra.tags || "";
        // Split by comma and check if tag exists
        return tags
          .split(",")
          .map((t) => t.trim())
          .includes(tag);
      }) as typeof featuredItems;
    } else {
      featuredItems = allItems as typeof featuredItems;
    }

    // Apply limit if specified
    if (limit) {
      featuredItems = featuredItems.slice(0, limit);
    }
  }

  if (!featuredItems || featuredItems.length === 0) {
    return [];
  }

  // Transform to display format
  return Promise.all(
    featuredItems.map(async (item) => {
      const extra = (item.extra as FeaturedItemExtra) || {};
      return {
        id: item.id,
        createdAt: item.createdAt,
        title: extra.title || "",
        description: extra.description || "",
        coverUrl: extra.coverObjectUrl ? await getS3SignedCdnUrl(extra.coverObjectUrl) : null,
        url: extra.url || "",
        category: (extra.category || AnalystKind.misc) as AnalystKind,
      };
    }),
  );
}

/**
 * Public action for fetching featured reports (no auth check needed)
 *
 * unstable_cache 原理：
 * - 函数参数会自动成为缓存key的一部分
 * - 实际缓存key: ["public-featured-reports", locale, tag, limit, random]
 * - 不同的参数组合有独立的缓存项
 * - 缓存时间: 1天 (86400秒)
 *
 * 缓存清除：
 * 在需要清除缓存时使用: revalidateTag("public-featured-reports")
 */
const getCachedFeaturedReports = unstable_cache(
  async (locale: Locale, tag?: string | "all", limit?: number, random?: boolean) => {
    return _fetchPublicFeaturedReportsImpl({
      locale,
      tag,
      limit,
      random,
    });
  },
  ["public-featured-reports"],
  {
    revalidate: 86400, // 1 day cache
    tags: ["public-featured-reports"],
  },
);

export async function fetchPublicFeaturedStudies({
  locale,
  tag,
  page = 1,
  pageSize = 12,
  random,
}: {
  locale: Locale;
  tag?: string | "all";
  page?: number;
  pageSize?: number;
  random?: boolean;
}): Promise<ServerActionResult<FeaturedReportResult[]>> {
  const localeResolved = locale || (await getLocale());
  const allData = await getCachedFeaturedReports(localeResolved, tag, undefined, random);

  // Apply pagination
  const totalCount = allData.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const skip = (page - 1) * pageSize;
  const paginatedData = allData.slice(skip, skip + pageSize);

  return {
    success: true,
    data: paginatedData,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
}
