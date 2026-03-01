"use server";
import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { AnalystKind } from "@/app/(study)/context/types";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { generateChatTitle } from "@/lib/userChat/lib";
import { User, UserChat } from "@/prisma/client";
import { UserChatWhereInput } from "@/prisma/models";
import { prisma } from "@/prisma/prisma";
import { searchProjects as searchProjectsFromMeili } from "@/search/lib/queries";
import { UIMessage } from "ai";
import { after } from "next/server";

/**
 * 判断是否是 token（16位字母数字）
 */
function isToken(query: string): boolean {
  return /^[a-zA-Z0-9]{16}$/.test(query);
}

/**
 * 判断是否是 email
 */
function isEmail(query: string): boolean {
  return query.includes("@");
}

/**
 * 从 slug 提取 ID（格式：study-123）
 */
function extractIdFromSlug(slug: string): number {
  const match = slug.match(/^study-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

// Get all analysts
export async function fetchStudies(
  page: number = 1,
  search?: string,
  pageSize: number = 12,
  kind?: AnalystKind | "all",
): Promise<
  ServerActionResult<
    (Pick<UserChat, "id" | "token" | "title" | "extra" | "context" | "createdAt"> & {
      user: Pick<User, "email">;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const skip = (page - 1) * pageSize;
  let where: UserChatWhereInput = { kind: "study" };
  let totalCount = 0;
  let orderedIds: number[] | null = null;
  let useDatabasePagination = true;

  // 三层搜索：token 精确匹配 → email 精确匹配 → 关键词走 MeiliSearch
  if (search) {
    const trimmedQuery = search.trim();

    if (isToken(trimmedQuery)) {
      where = { kind: "study", token: trimmedQuery };
    } else if (isEmail(trimmedQuery)) {
      where = { kind: "study", user: { email: trimmedQuery } };
    } else if (trimmedQuery) {
      // 关键词搜索：使用 MeiliSearch
      try {
        const searchResults = await searchProjectsFromMeili({
          query: trimmedQuery,
          type: "study",
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
        where = { kind: "study", id: { in: orderedIds } };
        totalCount = searchResults.totalHits;
        useDatabasePagination = false;
      } catch (error) {
        rootLogger.error({
          msg: "MeiliSearch study search failed",
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

  // Add kind filter (only for database pagination path)
  if (kind && kind !== "all" && useDatabasePagination) {
    where.context = {
      path: ["analystKind"],
      equals: kind,
    };
  }

  const studyUserChats = await prisma.userChat.findMany({
    where,
    select: {
      id: true,
      token: true,
      title: true,
      extra: true,
      context: true,
      createdAt: true,
      user: { select: { email: true } },
    },
    orderBy: useDatabasePagination ? { createdAt: "desc" } : undefined,
    skip: useDatabasePagination ? skip : undefined,
    take: useDatabasePagination ? pageSize : undefined,
  });

  if (useDatabasePagination) {
    totalCount = await prisma.userChat.count({ where });
  }

  // MeiliSearch 搜索时，按返回的顺序排序
  let sortedChats = studyUserChats;
  if (orderedIds) {
    const idToChat = new Map(studyUserChats.map((c) => [c.id, c]));
    sortedChats = orderedIds
      .map((id) => idToChat.get(id))
      .filter((c): c is (typeof studyUserChats)[0] => c !== undefined);
  }

  return {
    success: true,
    data: sortedChats,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

export async function generateChatTitleAction(
  userChatId: number,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  after(generateChatTitle(userChatId));

  return {
    success: true,
    data: undefined,
  };
}

// Fetch brief chat messages by chat ID
export async function fetchBriefChatMessages(
  briefUserChatToken: string,
): Promise<ServerActionResult<UIMessage[]>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const briefChat = await prisma.userChat.findUnique({
    where: { token: briefUserChatToken },
    include: {
      messages: {
        orderBy: { id: "asc" },
      },
    },
  });

  if (!briefChat) {
    return {
      success: false,
      message: "Brief chat not found",
    };
  }

  return {
    success: true,
    data: briefChat.messages.map(convertDBMessageToAIMessage),
  };
}
