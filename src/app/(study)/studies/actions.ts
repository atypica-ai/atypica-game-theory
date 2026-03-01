"use server";
import { UserChatContext } from "@/app/(study)/context/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserChatExtra } from "@/prisma/client";
import { UserChatWhereInput } from "@/prisma/models";
import { prisma } from "@/prisma/prisma";
import { searchProjects as searchProjectsFromMeili } from "@/search/lib/queries";

/**
 * 从 slug 提取 ID（格式：study-123）
 */
function extractIdFromSlug(slug: string): number {
  const match = slug.match(/^study-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

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
      createdAt: Date;
      updatedAt: Date;
    }[]
  >
> {
  return withAuth(async (user) => {
    const skip = (page - 1) * pageSize;
    let where: UserChatWhereInput = { userId: user.id, kind: "study" };
    let totalCount = 0;
    let orderedIds: number[] | null = null;
    let useDatabasePagination = true;

    if (searchQuery) {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery) {
        // 关键词搜索：使用 MeiliSearch，限定当前用户
        try {
          const searchResults = await searchProjectsFromMeili({
            query: trimmedQuery,
            type: "study",
            userId: user.id,
            page,
            pageSize,
          });

          if (searchResults.hits.length === 0) {
            return {
              success: true,
              data: [],
              pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
            };
          }

          orderedIds = searchResults.hits.map((hit) => extractIdFromSlug(hit.slug));
          where = { userId: user.id, kind: "study", id: { in: orderedIds } };
          totalCount = searchResults.totalHits;
          useDatabasePagination = false;
        } catch (error) {
          rootLogger.error({
            msg: "MeiliSearch user study search failed",
            error: error instanceof Error ? error.message : String(error),
          });
          return {
            success: true,
            data: [],
            pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
          };
        }
      }
    }

    if (useDatabasePagination) {
      totalCount = await prisma.userChat.count({ where });
    }

    const studyUserChats = await prisma.userChat.findMany({
      where,
      select: {
        id: true,
        token: true,
        kind: true,
        title: true,
        context: true,
        extra: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: useDatabasePagination ? { id: "desc" } : undefined,
      skip: useDatabasePagination ? skip : undefined,
      take: useDatabasePagination ? pageSize : undefined,
    });

    // MeiliSearch 搜索时，按返回的顺序排序
    const sortedChats = orderedIds
      ? (() => {
          const idToChat = new Map(studyUserChats.map((c) => [c.id, c]));
          return orderedIds
            .map((id) => idToChat.get(id))
            .filter((c): c is (typeof studyUserChats)[0] => c !== undefined);
        })()
      : studyUserChats;

    return {
      success: true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      data: sortedChats.map(({ kind, ...studyUserChat }) => ({
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
