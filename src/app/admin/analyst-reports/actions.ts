"use server";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { generateReportScreenshot } from "@/app/artifacts/lib/screenshot";
import { s3SignedUrl } from "@/lib/attachments/s3";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, AnalystReport, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

// Get all analyst reports with pagination
export async function fetchAnalystReportsAction(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
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
  const where = searchQuery
    ? {
        OR: [
          { token: { contains: searchQuery } },
          {
            analyst: {
              topic: { contains: searchQuery },
            },
          },
          {
            analyst: {
              user: {
                email: { contains: searchQuery },
              },
            },
          },
        ],
      }
    : {};

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
      let coverUrl: string | undefined;

      if (report.extra && typeof report.extra === "object" && "coverObjectUrl" in report.extra) {
        const coverObjectUrl = (report.extra as { coverObjectUrl?: string }).coverObjectUrl;
        if (coverObjectUrl) {
          try {
            coverUrl = await s3SignedUrl(coverObjectUrl);
          } catch (error) {
            console.error(`Failed to generate signed URL for report ${report.id}:`, error);
          }
        }
      }

      return {
        ...report,
        coverUrl,
      };
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
): Promise<ServerActionResult<string>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const report = (await prisma.analystReport.findUnique({
    where: { id: reportId },
    include: {
      analyst: {
        select: {
          userId: true,
          id: true,
          topic: true,
        },
      },
    },
  })) as Omit<AnalystReport, "extra"> & {
    extra: {
      coverObjectUrl?: string;
    } | null;
    analyst: {
      userId: number;
      id: number;
      topic: string;
    };
  };

  if (!report) {
    return {
      success: false,
      message: "Analyst report not found",
    };
  }

  try {
    const { coverUrl } = await generateReportScreenshot(report);
    revalidatePath("/admin/analyst-reports");
    return {
      success: true,
      data: coverUrl,
    };
  } catch (error) {
    return {
      success: false,
      message: (error as Error).message,
    };
  }
}
