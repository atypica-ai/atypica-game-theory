"use server";
import { generateReportCoverImage } from "@/ai/tools/experts/report/coverImage";
import { proxiedImageCdnUrl } from "@/app/(system)/cdn/lib";
// import { generateReportScreenshot } from "@/app/(study)/artifacts/lib/screenshot";
// import { reportCoverObjectUrlToHttpUrl } from "@/app/(study)/artifacts/report/actions";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, AnalystReport, AnalystReportExtra, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

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
      coverUrl?: string;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const skip = (page - 1) * pageSize;
  const where: {
    OR?: Array<{
      token?: { contains: string };
      analyst?: {
        topic?: { contains: string };
        brief?: { contains: string };
        user?: { email?: { contains: string } };
      };
    }>;
    analyst?: { featuredStudy: { isNot: null } };
  } = searchQuery
    ? {
        OR: [
          { token: { contains: searchQuery } },
          { analyst: { topic: { contains: searchQuery } } },
          { analyst: { brief: { contains: searchQuery } } },
          { analyst: { user: { email: { contains: searchQuery } } } },
        ],
      }
    : {};

  if (featuredOnly) {
    where.analyst = {
      featuredStudy: {
        isNot: null,
      },
    };
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

  // Generate cover URLs for reports that have coverObjectUrl
  const reportsWithCoverUrls = await Promise.all(
    analystReports.map(async (report) => {
      const objectUrl = (report.extra as AnalystReportExtra).coverObjectUrl;
      if (objectUrl) {
        const coverUrl = proxiedImageCdnUrl({ objectUrl });
        return { ...report, coverUrl };
      } else {
        return { ...report, coverUrl: undefined };
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
          studySummary: true,
          studyLog: true,
          brief: true,
        },
      },
      // extra: true,
    },
  })) as Pick<AnalystReport, "id" | "token"> & {
    // extra: AnalystReportExtra;
    analyst: Pick<Analyst, "id" | "locale" | "topic" | "studySummary" | "studyLog" | "brief">;
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
      analyst: report.analyst,
      report,
      locale,
      abortSignal,
      statReport,
      logger: rootLogger.child({ reportId, analystId: report.analyst.id }),
    }),
  );

  revalidatePath("/admin/studies/reports");
  return {
    success: true,
    data: undefined,
  };
}
