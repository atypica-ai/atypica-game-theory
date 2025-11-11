"use server";
import { generatePodcastMetadataTitle } from "@/app/(podcast)/lib/generation";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { Analyst, AnalystPodcast, AnalystPodcastExtra, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { Locale } from "next-intl";

// Get all analyst podcasts with pagination
export async function fetchAnalystPodcastsAction(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
): Promise<
  ServerActionResult<
    (AnalystPodcast & {
      analyst: Analyst & {
        user: Pick<User, "email"> | null;
      };
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

  return {
    success: true,
    data: analystPodcasts,
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

// Generate podcast title using AI
export async function generatePodcastTitleAction(
  podcastId: number,
): Promise<ServerActionResult<string>> {
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

    const title = await generatePodcastMetadataTitle({
      script: podcast.script,
      locale,
      abortSignal,
      statReport,
      logger,
    });

    return {
      success: true,
      data: title,
    };
  } catch (error) {
    console.error("Failed to generate podcast title:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate podcast title",
      code: "internal_server_error",
    };
  }
}
