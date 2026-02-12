"use server";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import {
  GoogleAnalyticsReporter,
  PageViewsReport,
  RegionFilter,
} from "@/lib/analytics/google/reporter";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystPodcast, AnalystReport, User, UserChat } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";

export interface PageViewWithReport extends PageViewsReport {
  report?: AnalystReport & {
    user: Pick<User, "email"> | null;
    coverUrl?: string;
  };
}

export interface PageViewWithStudy extends PageViewsReport {
  study?: UserChat & {
    user: Pick<User, "email"> | null;
  };
}

export interface PageViewWithPodcast extends PageViewsReport {
  podcast?: Pick<AnalystPodcast, "id" | "token" | "script" | "extra" | "createdAt"> & {
    user: Pick<User, "email"> | null;
  };
}

export async function fetchTopPageViewsAction(
  days: number = 30,
  limit: number = 20,
  regionFilter: RegionFilter = "all",
): Promise<ServerActionResult<PageViewWithReport[]>> {
  await checkAdminAuth([AdminPermission.VIEW_STATISTICS]);

  try {
    const reporter = new GoogleAnalyticsReporter();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Get report pageviews from Google Analytics with limit
    const reportViews = await reporter.getSharePagesViews(
      ["report"],
      startDateStr,
      endDateStr,
      limit,
      regionFilter,
    );

    // Deduplicate by pagePath, keeping the record with highest users count
    const deduplicatedReports = new Map<string, PageViewsReport>();
    reportViews.forEach((report) => {
      const existing = deduplicatedReports.get(report.pagePath);
      if (!existing || report.users > existing.users) {
        deduplicatedReports.set(report.pagePath, report);
      }
    });

    // Convert back to array and sort by users (descending)
    const topReports = Array.from(deduplicatedReports.values())
      .sort((a, b) => b.users - a.users)
      .slice(0, limit);

    // Extract report tokens from the page paths
    const reportTokens = topReports
      .map((report) => {
        const match = report.pagePath.match(/\/artifacts\/report\/([^\/]+)\/share/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    // Fetch report details from database
    const reportDetails = await prismaRO.analystReport.findMany({
      where: {
        token: {
          in: reportTokens,
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    // Generate cover URLs for reports that have coverObjectUrl
    const reportsWithCoverUrls = await Promise.all(
      reportDetails.map(async (report) => {
        const objectUrl = report.extra.coverObjectUrl;
        if (objectUrl) {
          const coverUrl = await getS3SignedCdnUrl(objectUrl);
          return { ...report, coverUrl };
        } else {
          return { ...report, coverUrl: undefined };
        }
      }),
    );

    // Create a map for quick lookup
    const reportMap = new Map(reportsWithCoverUrls.map((report) => [report.token, report]));

    // Combine pageview data with report details
    const result: PageViewWithReport[] = topReports.map((pageView) => {
      const match = pageView.pagePath.match(/\/artifacts\/report\/([^\/]+)\/share/);
      const token = match ? match[1] : null;
      const report = token ? reportMap.get(token) : undefined;
      return {
        ...pageView,
        report,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error fetching top page views:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch page views",
    };
  }
}

export async function fetchTopStudyPageViewsAction(
  days: number = 30,
  limit: number = 20,
  regionFilter: RegionFilter = "all",
): Promise<ServerActionResult<PageViewWithStudy[]>> {
  await checkAdminAuth([AdminPermission.VIEW_STATISTICS]);

  try {
    const reporter = new GoogleAnalyticsReporter();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Get study pageviews from Google Analytics with limit
    const studyViews = await reporter.getSharePagesViews(
      ["study"],
      startDateStr,
      endDateStr,
      limit,
      regionFilter,
    );

    // Deduplicate by pagePath, keeping the record with highest users count
    const deduplicatedStudies = new Map<string, PageViewsReport>();
    studyViews.forEach((study) => {
      const existing = deduplicatedStudies.get(study.pagePath);
      if (!existing || study.users > existing.users) {
        deduplicatedStudies.set(study.pagePath, study);
      }
    });

    // Convert back to array and sort by users (descending)
    const topStudies = Array.from(deduplicatedStudies.values())
      .sort((a, b) => b.users - a.users)
      .slice(0, limit);

    // Extract study tokens from the page paths
    const studyTokens = topStudies
      .map((study) => {
        const match = study.pagePath.match(/\/study\/([^\/]+)\/share/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    // Fetch study details from database
    const studyDetails = await prismaRO.userChat.findMany({
      where: {
        token: {
          in: studyTokens,
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    // Create a map for quick lookup
    const studyMap = new Map(studyDetails.map((study) => [study.token, study]));

    // Combine pageview data with study details
    const result: PageViewWithStudy[] = topStudies.map((pageView) => {
      const match = pageView.pagePath.match(/\/study\/([^\/]+)\/share/);
      const token = match ? match[1] : null;
      const study = token ? studyMap.get(token) : undefined;
      return {
        ...pageView,
        study,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error fetching top study page views:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch study page views",
    };
  }
}

export async function fetchTopPodcastPageViewsAction(
  days: number = 30,
  limit: number = 20,
  regionFilter: RegionFilter = "all",
): Promise<ServerActionResult<PageViewWithPodcast[]>> {
  await checkAdminAuth([AdminPermission.VIEW_STATISTICS]);

  try {
    const reporter = new GoogleAnalyticsReporter();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Get podcast pageviews from Google Analytics with limit
    const podcastViews = await reporter.getSharePagesViews(
      ["podcast"],
      startDateStr,
      endDateStr,
      limit,
      regionFilter,
    );

    // Deduplicate by pagePath, keeping the record with highest users count
    const deduplicatedPodcasts = new Map<string, PageViewsReport>();
    podcastViews.forEach((podcast) => {
      const existing = deduplicatedPodcasts.get(podcast.pagePath);
      if (!existing || podcast.users > existing.users) {
        deduplicatedPodcasts.set(podcast.pagePath, podcast);
      }
    });

    // Convert back to array and sort by users (descending)
    const topPodcasts = Array.from(deduplicatedPodcasts.values())
      .sort((a, b) => b.users - a.users)
      .slice(0, limit);

    // Extract podcast tokens from the page paths
    const podcastTokens = topPodcasts
      .map((podcast) => {
        const match = podcast.pagePath.match(/\/artifacts\/podcast\/([^\/]+)\/share/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];

    // Fetch podcast details from database
    const podcastDetails = await prismaRO.analystPodcast.findMany({
      where: {
        token: {
          in: podcastTokens,
        },
      },
      select: {
        id: true,
        token: true,
        script: true,
        extra: true,
        createdAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    // Create a map for quick lookup
    const podcastMap = new Map(podcastDetails.map((podcast) => [podcast.token, podcast]));

    // Combine pageview data with podcast details
    const result: PageViewWithPodcast[] = topPodcasts.map((pageView) => {
      const match = pageView.pagePath.match(/\/artifacts\/podcast\/([^\/]+)\/share/);
      const token = match ? match[1] : null;
      const podcast = token ? podcastMap.get(token) : undefined;
      return {
        ...pageView,
        podcast,
      };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error fetching top podcast page views:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch podcast page views",
    };
  }
}
