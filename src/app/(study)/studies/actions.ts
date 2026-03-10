"use server";
import { UserChatContext } from "@/app/(study)/context/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { searchProjects as searchProjectsFromMeili } from "@/search/lib/queries";
import { syncProject as syncProjectToMeili } from "@/search/lib/sync";
import { waitUntil } from "@vercel/functions";

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
  archived = false,
}: {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  archived?: boolean;
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
    const emptyResult = {
      success: true as const,
      data: [],
      pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
    };
    let orderedIds: number[];
    let totalCount: number;

    if (searchQuery?.trim()) {
      try {
        const searchResults = await searchProjectsFromMeili({
          query: searchQuery.trim(),
          type: "study",
          userId: user.id,
          archived,
          page,
          pageSize,
        });
        if (searchResults.hits.length === 0) return emptyResult;
        orderedIds = searchResults.hits.map((hit) => extractIdFromSlug(hit.slug));
        totalCount = searchResults.totalHits;
      } catch (error) {
        rootLogger.error({
          msg: "MeiliSearch user study search failed",
          error: error instanceof Error ? error.message : String(error),
        });
        return emptyResult;
      }
    } else if (archived) {
      const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM "UserChat"
        WHERE "userId" = ${user.id} AND "kind" = 'study'
        AND "extra" @> '{"archived":true}'::jsonb`;
      totalCount = Number(count);
      if (totalCount === 0) return emptyResult;
      const rows = await prisma.$queryRaw<{ id: number }[]>`
        SELECT "id" FROM "UserChat"
        WHERE "userId" = ${user.id} AND "kind" = 'study'
        AND "extra" @> '{"archived":true}'::jsonb
        ORDER BY "id" DESC LIMIT ${pageSize} OFFSET ${skip}`;
      orderedIds = rows.map((r) => r.id);
    } else {
      const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM "UserChat"
        WHERE "userId" = ${user.id} AND "kind" = 'study'
        AND NOT ("extra" @> '{"archived":true}'::jsonb)`;
      totalCount = Number(count);
      if (totalCount === 0) return emptyResult;
      const rows = await prisma.$queryRaw<{ id: number }[]>`
        SELECT "id" FROM "UserChat"
        WHERE "userId" = ${user.id} AND "kind" = 'study'
        AND NOT ("extra" @> '{"archived":true}'::jsonb)
        ORDER BY "id" DESC LIMIT ${pageSize} OFFSET ${skip}`;
      orderedIds = rows.map((r) => r.id);
    }

    if (orderedIds.length === 0) {
      return {
        success: true as const,
        data: [],
        pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
      };
    }

    const studyUserChats = await prisma.userChat.findMany({
      where: { id: { in: orderedIds } },
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
    });

    const idToChat = new Map(studyUserChats.map((c) => [c.id, c]));
    const sortedChats = orderedIds
      .map((id) => idToChat.get(id))
      .filter((c): c is (typeof studyUserChats)[0] => c !== undefined);

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

export async function archiveStudy(
  userChatId: number,
  archived: boolean,
): Promise<ServerActionResult<null>> {
  return withAuth(async (user) => {
    // 确保 userChat 属于用户
    const chat = await prisma.userChat.findUnique({
      where: { id: userChatId, userId: user.id, kind: "study" },
      select: { id: true },
    });
    if (!chat) return { success: false, message: "Not found", code: "not_found" };
    await mergeExtra({ tableName: "UserChat", id: userChatId, extra: { archived } });
    waitUntil(
      syncProjectToMeili({ type: "study", id: userChatId }).catch(() => {
        // 方法里已经 log 了，无需再次 log，这里跳过错误
      }),
    );
    return { success: true, data: null };
  });
}
