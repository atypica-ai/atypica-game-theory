"use server";
import { generateReportCoverImage } from "@/app/(study)/tools/generateReport/coverImage";
// import { generateReportScreenshot } from "@/app/(study)/artifacts/lib/screenshot";
// import { reportCoverObjectUrlToHttpUrl } from "@/app/(study)/artifacts/report/actions";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage, truncateForTitle } from "@/lib/textUtils";
import {
  AnalystReport,
  AnalystReportExtra,
  FeaturedItemExtra,
  FeaturedItemResourceType,
  User,
} from "@/prisma/client";
import { AnalystReportWhereInput } from "@/prisma/models";
import { prisma, prismaRO } from "@/prisma/prisma";
import { searchArtifacts as searchArtifactsFromMeili } from "@/search/lib/queries";
import { syncReport as syncReportToMeili } from "@/search/lib/sync";
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
 * 从 slug 提取 ID（格式：report-123）
 */
function extractIdFromSlug(slug: string): number {
  const match = slug.match(/^report-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

// Get all analyst reports with pagination
export async function fetchAnalystReportsAction(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
  featuredOnly?: boolean,
): Promise<
  ServerActionResult<
    (AnalystReport & {
      user: Pick<User, "email"> | null;
      coverCdnHttpUrl?: string;
      isFeatured?: boolean;
      tags?: string;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const skip = (page - 1) * pageSize;
  let where: AnalystReportWhereInput = {};
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
          type: "report",
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

  // Get featured report IDs if featuredOnly filter is active
  // Note: 对于 Meilisearch 搜索，已经在上面通过 isFeatured 参数过滤了，这里只处理 token/email 搜索
  if (featuredOnly && useDatabasePagination) {
    const featuredItems = await prismaRO.featuredItem.findMany({
      where: {
        resourceType: FeaturedItemResourceType.AnalystReport,
      },
      select: {
        resourceId: true,
      },
    });
    const featuredReportIds = featuredItems.map((item) => item.resourceId);

    if (featuredReportIds.length === 0) {
      // No featured reports, return empty result
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
      where.id = { in: existingIds.filter((id) => featuredReportIds.includes(id)) };
    } else {
      where.id = { in: featuredReportIds };
    }
  }

  const analystReports = await prismaRO.analystReport.findMany({
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
    totalCount = await prismaRO.analystReport.count({ where });
  }

  // 如果是 Meilisearch 搜索，按照返回的顺序排序
  let sortedReports = analystReports;
  if (orderedIds) {
    const idToReport = new Map(analystReports.map((r) => [r.id, r]));
    sortedReports = orderedIds
      .map((id) => idToReport.get(id))
      .filter((r): r is (typeof analystReports)[0] => r !== undefined);
  }

  // Check featured status for each report and get tags
  const reportIds = sortedReports.map((r) => r.id);
  const featuredItems = await prismaRO.featuredItem.findMany({
    where: {
      resourceType: FeaturedItemResourceType.AnalystReport,
      resourceId: { in: reportIds },
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

  // Generate cover URLs for reports that have coverObjectUrl
  const reportsWithCoverUrls = await Promise.all(
    sortedReports.map(async (report) => {
      const objectUrl = report.extra.coverObjectUrl;
      const featuredInfo = featuredItemsMap.get(report.id);
      if (objectUrl) {
        const coverCdnHttpUrl = await getS3SignedCdnUrl(objectUrl);
        return {
          ...report,
          coverCdnHttpUrl,
          isFeatured: featuredInfo?.isFeatured || false,
          tags: featuredInfo?.tags || "",
        };
      } else {
        return {
          ...report,
          coverCdnHttpUrl: undefined,
          isFeatured: featuredInfo?.isFeatured || false,
          tags: featuredInfo?.tags || "",
        };
      }
    }),
  );

  return {
    success: true,
    data: reportsWithCoverUrls,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// Generate screenshot for an analyst report
export async function adminGenerateScreenshotAction(
  reportId: number,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const report = (await prisma.analystReport.findUniqueOrThrow({
    where: { id: reportId },
    select: {
      id: true,
      token: true,
      extra: true,
    },
  })) as Pick<AnalystReport, "id" | "token"> & {
    extra: AnalystReportExtra;
  };

  // Empty stat reporter for admin (free generation)
  const statReport = async () => {};
  const abortSignal = AbortSignal.timeout(300_000); // 5 minutes timeout

  // const { coverUrl } = await generateReportScreenshot(report);
  // ⚠️ 重新生成封面的时候，直接使用 report 上的 description
  const studyLog = report.extra.description || report.extra.title;
  if (!studyLog) {
    return {
      success: false,
      message: "Missing report description or title",
    };
  }
  const locale = await detectInputLanguage({ text: studyLog });
  waitUntil(
    generateReportCoverImage({
      ratio: "landscape",
      studyLog,
      report,
      locale,
      abortSignal,
      statReport,
      logger: rootLogger.child({ reportId }),
    }).catch(() => {}),
  );

  revalidatePath("/admin/studies/reports");
  return {
    success: true,
    data: undefined,
  };
}

// Toggle featured status for a report
export async function featureReportAction(reportId: number): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const report = await prisma.analystReport.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    return {
      success: false,
      message: "Report not found",
      code: "not_found",
    };
  }

  // Check if already featured
  const existingFeatured = await prisma.featuredItem.findFirst({
    where: {
      resourceType: FeaturedItemResourceType.AnalystReport,
      resourceId: reportId,
    },
  });

  if (existingFeatured) {
    // Remove from featured
    await prisma.featuredItem.delete({
      where: { id: existingFeatured.id },
    });
  } else {
    // Add to featured - copy info from report
    const extra = report.extra;
    if (!extra.title || !extra.description) {
      return {
        success: false,
        message: "Missing title or description",
      };
    }
    const title = extra?.title || "";
    const description = truncateForTitle(extra.description || "", {
      maxDisplayWidth: 200,
      suffix: "...",
    });
    const locale = await detectInputLanguage({
      text: `${title}\n${description}`,
    });

    await prisma.featuredItem.create({
      data: {
        resourceType: FeaturedItemResourceType.AnalystReport,
        resourceId: reportId,
        locale,
        extra: {
          title,
          description,
          coverObjectUrl: extra?.coverObjectUrl || "",
          url: `/artifacts/report/${report.token}/share`,
          // category: report.analyst.kind || undefined, // 保留字段但不使用
          tags: report.extra.analystKind || "", // 默认写入 kind 作为 tags
        } satisfies FeaturedItemExtra,
      },
    });
  }

  // 同步更新 Meilisearch 中的 isFeatured 状态
  waitUntil(
    syncReportToMeili(reportId).catch(() => {
      // 方法里已经 log 了，无需再次 log，这里跳过错误
    }),
  );

  revalidatePath("/admin/studies/reports");
  revalidateTag("public-featured-items");
  return {
    success: true,
    data: undefined,
  };
}

// Update tags for a featured report
export async function updateFeaturedItemTagsAction(
  reportId: number,
  tags: string,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  // Find the featured item for this report
  const featuredItem = await prisma.featuredItem.findFirst({
    where: {
      resourceType: FeaturedItemResourceType.AnalystReport,
      resourceId: reportId,
    },
  });

  if (!featuredItem) {
    return {
      success: false,
      message: "Report is not featured",
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

  revalidatePath("/admin/studies/reports");
  revalidateTag("public-featured-items");
  return {
    success: true,
    data: undefined,
  };
}
