"use server";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystKind, ChatMessageAttachment } from "@/prisma/client";
import { AnalystWhereInput } from "@/prisma/models";
import { prisma } from "@/prisma/prisma";

export async function fetchUserStudies({
  page = 1,
  pageSize = 12,
  searchQuery = "",
}: {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
} = {}): Promise<
  ServerActionResult<
    {
      studyUserChat: {
        title: string;
        id: number;
        token: string;
        kind: "study";
        backgroundToken: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
      analyst: {
        topic: string;
        kind: AnalystKind | null;
        reports: {
          id: number;
          token: string;
        }[];
        podcasts: {
          id: number;
          token: string;
        }[];
        attachments: ChatMessageAttachment[];
        id: number;
      };
    }[]
  >
> {
  return withAuth(async (user) => {
    // Calculate skip for pagination
    const skip = (page - 1) * pageSize;

    // Build where condition with search and user filters
    const where: AnalystWhereInput = {
      userId: user.id,
      studyUserChatId: {
        not: null,
      },
      // studyUserChat: {
      //   kind: "study",
      // },
    };

    // Add search condition if provided
    if (searchQuery) {
      where.OR = [
        {
          studyUserChat: {
            title: { contains: searchQuery, mode: "insensitive" },
          },
        },
        {
          topic: { contains: searchQuery, mode: "insensitive" },
        },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.analyst.count({ where });

    // Step 1: Get main analyst data (attachments is a Json field, not a relation)
    const analysts = await prisma.analyst.findMany({
      where,
      select: {
        id: true,
        topic: true,
        kind: true,
        attachments: true,
        studyUserChat: {
          select: {
            id: true,
            token: true,
            kind: true,
            title: true,
            backgroundToken: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { id: "desc" },
      skip,
      take: pageSize,
    });

    // Filter valid analysts early
    const validAnalysts = analysts.filter(
      ({ studyUserChat }) => !!studyUserChat && studyUserChat.kind === "study",
    );

    // Extract analyst IDs for batch queries
    const analystIds = validAnalysts.map((a) => a.id);

    const [allReports, allPodcasts] = await Promise.all([
      // Step 2: Batch fetch reports for all analysts (1 query instead of N)
      prisma.analystReport.findMany({
        where: { analystId: { in: analystIds }, generatedAt: { not: null } },
        select: { id: true, token: true, analystId: true },
      }),
      // Step 3: Batch fetch podcasts for all analysts (1 query instead of N)
      prisma.analystPodcast.findMany({
        where: { analystId: { in: analystIds }, generatedAt: { not: null } },
        select: { id: true, token: true, analystId: true },
      }),
    ]);

    // Step 4: Group data by analystId for O(1) lookup
    const reportsMap = new Map<number, { id: number; token: string }[]>();
    const podcastsMap = new Map<number, { id: number; token: string }[]>();

    allReports.forEach((report) => {
      const { analystId, ...reportData } = report;
      if (!reportsMap.has(analystId)) {
        reportsMap.set(analystId, []);
      }
      reportsMap.get(analystId)!.push(reportData);
    });

    allPodcasts.forEach((podcast) => {
      const { analystId, ...podcastData } = podcast;
      if (!podcastsMap.has(analystId)) {
        podcastsMap.set(analystId, []);
      }
      podcastsMap.get(analystId)!.push(podcastData);
    });

    // Step 5: Combine data
    return {
      success: true,
      data: validAnalysts.map(({ studyUserChat, ...analyst }) => {
        return {
          studyUserChat: studyUserChat as Omit<NonNullable<typeof studyUserChat>, "kind"> & {
            kind: "study";
          },
          analyst: {
            ...analyst,
            reports: reportsMap.get(analyst.id) || [],
            podcasts: podcastsMap.get(analyst.id) || [],
            attachments: analyst.attachments as ChatMessageAttachment[],
            kind: analyst.kind as AnalystKind | null,
          },
        };
      }),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  });
}
