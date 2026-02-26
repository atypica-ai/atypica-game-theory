import "server-only";

import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { prismaRO } from "@/prisma/prisma";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const listChatsInputSchema = z.object({
  page: z.number().int().min(1).default(1).describe("Page number"),
  pageSize: z.number().int().min(1).max(100).default(20).describe("Items per page"),
});

export async function handleListChats(
  args: z.infer<typeof listChatsInputSchema>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<CallToolResult> {
  try {
    const context = getMcpRequestContext();
    if (!context?.userId) {
      throw new Error("Missing userId in request context");
    }

    const { page, pageSize } = args;
    const userId = context.userId;

    const where = {
      userId,
      kind: "universal" as const,
    };

    const [totalCount, chats] = await Promise.all([
      prismaRO.userChat.count({ where }),
      prismaRO.userChat.findMany({
        where,
        select: {
          id: true,
          token: true,
          title: true,
          backgroundToken: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data = chats.map((chat) => ({
      chatId: chat.id,
      token: chat.token,
      title: chat.title,
      isRunning: !!chat.backgroundToken,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    }));

    return {
      content: [{ type: "text", text: `Found ${totalCount} universal chats (showing ${data.length})` }],
      structuredContent: {
        data,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: "Failed to list universal chats", error: errorMessage });
    return {
      content: [{ type: "text", text: `Error listing chats: ${errorMessage}` }],
      isError: true,
    };
  }
}
