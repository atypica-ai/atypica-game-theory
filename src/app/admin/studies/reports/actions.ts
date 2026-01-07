"use server";
import { generateReportCoverImage } from "@/app/(study)/tools/generateReport/coverImage";
// import { generateReportScreenshot } from "@/app/(study)/artifacts/lib/screenshot";
// import { reportCoverObjectUrlToHttpUrl } from "@/app/(study)/artifacts/report/actions";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import {
  Analyst,
  AnalystReport,
  AnalystReportExtra,
  FeaturedItemExtra,
  FeaturedItemResourceType,
  User,
} from "@/prisma/client";
import { AnalystReportWhereInput } from "@/prisma/models";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { revalidatePath, revalidateTag } from "next/cache";

// Get all analyst reports with pagination
export async function fetchAnalystReportsAction(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
  featuredOnly?: boolean,
): Promise<
  ServerActionResult<
    (AnalystReport & {
      analyst: Analyst & {
        user: Pick<User, "email"> | null;
      };
      coverCdnHttpUrl?: string;
      isFeatured?: boolean;
      tags?: string;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const skip = (page - 1) * pageSize;
  const where: AnalystReportWhereInput = searchQuery
    ? {
        OR: [
          { token: { contains: searchQuery } },
          { analyst: { topic: { contains: searchQuery } } },
          { analyst: { brief: { contains: searchQuery } } },
          { analyst: { user: { email: { contains: searchQuery } } } },
        ],
      }
    : {};

  // Get featured report IDs if featuredOnly filter is active
  if (featuredOnly) {
    const featuredItems = await prisma.featuredItem.findMany({
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

    where.id = { in: featuredReportIds };
  }

  const analystReports = await prisma.analystReport.findMany({
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

  const totalCount = await prisma.analystReport.count({ where });

  // Check featured status for each report and get tags
  const reportIds = analystReports.map((r) => r.id);
  const featuredItems = await prisma.featuredItem.findMany({
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
    analystReports.map(async (report) => {
      const objectUrl = (report.extra as AnalystReportExtra).coverObjectUrl;
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
      analyst: {
        select: {
          id: true,
          locale: true,
          topic: true,
          studyLog: true,
          brief: true,
        },
      },
      // extra: true,
    },
  })) as Pick<AnalystReport, "id" | "token"> & {
    // extra: AnalystReportExtra;
    analyst: Pick<Analyst, "id" | "locale" | "topic" | "studyLog" | "brief">;
  };

  // Determine locale from analyst or use default
  const locale: Locale =
    report.analyst.locale === "zh-CN"
      ? "zh-CN"
      : report.analyst.locale === "en-US"
        ? "en-US"
        : await getLocale();

  // Empty stat reporter for admin (free generation)
  const statReport = async () => {};
  const abortSignal = AbortSignal.timeout(300_000); // 5 minutes timeout

  // const { coverUrl } = await generateReportScreenshot(report);
  waitUntil(
    generateReportCoverImage({
      ratio: "landscape",
      analyst: report.analyst,
      report,
      locale,
      abortSignal,
      statReport,
      logger: rootLogger.child({ reportId, analystId: report.analyst.id }),
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
    include: {
      analyst: {
        select: {
          locale: true,
          kind: true,
          topic: true,
          studyUserChat: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  if (!report) {
    return {
      success: false,
      message: "Report not found",
      code: "not_found",
    };
  }

  // Check if analyst has valid locale
  if (!report.analyst.locale || !VALID_LOCALES.includes(report.analyst.locale as Locale)) {
    return {
      success: false,
      message: "Analyst locale is not valid. Cannot feature this report.",
      code: "forbidden",
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
    const extra = report.extra as AnalystReportExtra;
    const title = report.analyst.studyUserChat?.title || "";
    const description = truncateForTitle(report.analyst.topic, {
      maxDisplayWidth: 200,
      suffix: "...",
    });

    await prisma.featuredItem.create({
      data: {
        resourceType: FeaturedItemResourceType.AnalystReport,
        resourceId: reportId,
        locale: report.analyst.locale as Locale,
        extra: {
          title,
          description,
          coverObjectUrl: extra?.coverObjectUrl || "",
          url: `/artifacts/report/${report.token}/share`,
          category: report.analyst.kind || undefined, // 保留字段但不使用
          tags: report.analyst.kind || "", // 默认写入 kind 作为 tags
        } satisfies FeaturedItemExtra,
      },
    });
  }

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
