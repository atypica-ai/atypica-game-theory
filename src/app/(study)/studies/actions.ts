"use server";
import { AnalystKind, UserChatContext } from "@/app/(study)/context/types";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { ChatMessageAttachment } from "@/prisma/client";
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
        context: UserChatContext;
        backgroundToken: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
      analyst: {
        topic: string;
        kind: AnalystKind | null;
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
            context: true,
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

    return {
      success: true,
      data: validAnalysts.map(({ studyUserChat, ...analyst }) => {
        return {
          studyUserChat: studyUserChat as Omit<
            NonNullable<typeof studyUserChat>,
            "kind" | "context"
          > & {
            kind: "study";
            context: UserChatContext;
          },
          analyst: {
            ...analyst,
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
