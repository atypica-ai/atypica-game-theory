"use server";
import { UserChatContext } from "@/app/(study)/context/types";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserChatExtra } from "@/prisma/client";
import { UserChatWhereInput } from "@/prisma/models";
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
      title: string;
      id: number;
      token: string;
      kind: "study";
      context: UserChatContext;
      extra: UserChatExtra;
      backgroundToken: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >
> {
  return withAuth(async (user) => {
    // Calculate skip for pagination
    const skip = (page - 1) * pageSize;

    // Build where condition with search and user filters
    const where: UserChatWhereInput = {
      userId: user.id,
      kind: "study",
    };

    // Add search condition if provided
    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        {
          context: {
            path: ["studyTopic"],
            string_contains: searchQuery,
            mode: "insensitive",
          },
        },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.userChat.count({ where });

    // Step 1: Get main studyUserChat data (attachments is a Json field, not a relation)
    const studyUserChats = await prisma.userChat.findMany({
      where,
      select: {
        id: true,
        token: true,
        kind: true,
        title: true,
        context: true,
        extra: true,
        backgroundToken: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { id: "desc" },
      skip,
      take: pageSize,
    });

    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      data: studyUserChats.map(({ kind, ...studyUserChat }) => ({
        kind: "study",
        ...studyUserChat,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  });
}
