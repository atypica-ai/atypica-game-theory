"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { AdminPermission, checkAdminAuth } from "../utils";

export type TokenSource = {
  reportedBy: string;
  originalTokens: number;
  tokens: number;
  reducedTokens: number;
};

export type ChatTokenConsumptionData = {
  userChatId: number;
  token: string;
  title: string;
  kind?: string;
  userId: number;
  userName: string | null;
  userEmail: string;
  tokenSources: TokenSource[];
  totalTokens: number;
  totalReducedTokens: number;
  createdAt: Date;
};

export async function fetchTokenConsumption(
  page: number = 1,
  pageSize: number = 50,
): Promise<ServerActionResult<ChatTokenConsumptionData[]>> {
  // Ensure only admins with proper permissions can access this data
  await checkAdminAuth([AdminPermission.VIEW_TOKEN_CONSUMPTION]);

  // Calculate pagination
  const skip = (page - 1) * pageSize;

  // Get all data in a single query - with reduction calculation
  const result = await prisma.$queryRaw`
    SELECT
      uc.id as "userChatId",
      uc.token,
      uc.title,
      uc."userId",
      u.name as "userName",
      u.email as "userEmail",
      uc."createdAt",
      COALESCE(cs.extra->>'reportedBy', 'Unknown') as "reportedBy",
      SUM(COALESCE((cs.extra->'reduceTokens'->>'originalTokens')::NUMERIC, 0)) as "originalTokens",
      SUM(cs.value) as "tokens",
      SUM(
        CASE
          WHEN COALESCE((cs.extra->'reduceTokens'->>'originalTokens')::NUMERIC, 0) > 0
          THEN COALESCE((cs.extra->'reduceTokens'->>'originalTokens')::NUMERIC, 0) - cs.value
          ELSE 0
        END
      ) as "reducedTokens"
    FROM "ChatStatistics" as cs
    INNER JOIN "UserChat" as uc ON uc.id = cs."userChatId"
    INNER JOIN "User" as u ON u.id = uc."userId"
    WHERE cs."dimension" = 'tokens' and uc."kind" = 'study'
    GROUP BY uc.id, uc.token, uc.title, uc."userId", u.name, u.email, cs.extra->>'reportedBy'
    ORDER BY uc.id DESC, "tokens" DESC
    LIMIT ${pageSize * 10}
    OFFSET ${skip}
  `;

  // Process the results to group by chat
  const chatMap = new Map<number, ChatTokenConsumptionData>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (result as any[]).forEach((row) => {
    const chatId = Number(row.userChatId);
    const originalTokens = Number(row.originalTokens || 0);
    const tokens = Number(row.tokens || 0);
    const reducedTokens = Number(row.reducedTokens || 0);

    // Initialize chat if it doesn't exist in the map
    if (!chatMap.has(chatId)) {
      chatMap.set(chatId, {
        userChatId: chatId,
        token: row.token,
        title: row.title || "",
        kind: row.kind,
        userId: Number(row.userId),
        userName: row.userName,
        userEmail: row.userEmail,
        createdAt: new Date(row.createdAt),
        tokenSources: [],
        totalTokens: 0,
        totalReducedTokens: 0,
      });
    }

    const chat = chatMap.get(chatId)!;

    // Add token source
    chat.tokenSources.push({
      reportedBy: row.reportedBy,
      originalTokens: originalTokens,
      tokens: tokens,
      reducedTokens: reducedTokens,
    });

    // Update totals
    chat.totalTokens += tokens;
    chat.totalReducedTokens += reducedTokens;
  });

  // Get total count for pagination
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countResult: any = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT cs."userChatId") as count
    FROM "ChatStatistics" cs
    WHERE cs.dimension = 'tokens'
  `;

  const totalCount = Number(countResult[0].count);

  // Convert map to array and sort by userChatId
  const chatList = Array.from(chatMap.values())
    .sort((a, b) => b.userChatId - a.userChatId)
    .slice(0, pageSize); // Only take the requested page size

  return {
    success: true,
    data: chatList,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
