"use server";
import { AnalystKind } from "@/app/(public)/featured-studies/data";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
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
        id: number;
      } | null;
    }[]
  >
> {
  return withAuth(async (user) => {
    // Calculate skip for pagination
    const skip = (page - 1) * pageSize;

    // Build where condition with search and user filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: user.id, kind: "study" };

    // Add search condition if provided
    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        {
          analyst: {
            topic: { contains: searchQuery, mode: "insensitive" },
          },
        },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.userChat.count({ where });

    // Get paginated user chats
    const userChats = await prisma.userChat.findMany({
      where,
      select: {
        id: true,
        token: true,
        title: true,
        backgroundToken: true,
        createdAt: true,
        updatedAt: true,
        analyst: {
          select: {
            id: true,
            topic: true,
            kind: true,
            reports: {
              where: { generatedAt: { not: null } },
              select: { id: true, token: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
    });

    return {
      success: true,
      data: userChats.map(({ analyst, ...userChat }) => {
        return {
          studyUserChat: userChat,
          analyst: analyst
            ? {
                ...analyst,
                kind: analyst.kind as AnalystKind | null,
              }
            : null,
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
