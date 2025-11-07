"use server";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, AnalystPodcast, AnalystPodcastExtra, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";

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
