import "server-only";

import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { prisma } from "@/prisma/prisma";
import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { z } from "zod";

export const getMessagesInputSchema = z.object({
  userChatToken: z.string().describe("The study session token"),
  afterMessageId: z.string().optional().describe("Get messages after this message ID"),
  limit: z.number().int().min(1).max(100).default(50).describe("Max messages to return"),
});

export async function handleGetMessages(
  args: z.infer<typeof getMessagesInputSchema>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<CallToolResult> {
  try {
    const context = getMcpRequestContext();
    if (!context?.userId) {
      throw new Error("Missing userId in request context");
    }

    const { userChatToken, afterMessageId, limit } = args;
    const userId = context.userId;

    // Verify ownership and check background status
    const userChat = await prisma.userChat.findUnique({
      where: { token: userChatToken, kind: "study" },
      select: { id: true, userId: true, backgroundToken: true },
    });

    if (!userChat) {
      throw new Error("Study not found");
    }

    if (userChat.userId !== userId) {
      throw new Error("Unauthorized: Study does not belong to user");
    }

    // Check if research is running in background
    const isRunning = !!userChat.backgroundToken;

    // Build query
    const whereClause = {
      userChatId: userChat.id,
      ...(afterMessageId
        ? {
            id: {
              gt: (
                await prisma.chatMessage.findUnique({
                  where: { messageId: afterMessageId },
                  select: { id: true },
                })
              )?.id,
            },
          }
        : {}),
    };

    const dbMessages = await prisma.chatMessage.findMany({
      where: whereClause,
      orderBy: { id: "asc" },
      take: limit,
    });

    // Use convertDBMessagesToAIMessages for proper format conversion
    const messages = await convertDBMessagesToAIMessages(dbMessages);

    const messagesText = messages
      .map((msg) => {
        const textParts = msg.parts.filter((p) => p.type === "text").map((p) => p.text);
        return `[${msg.role}] ${textParts.join("")}`;
      })
      .join("\n");

    return {
      content: [{ type: "text", text: messagesText || "No messages found" }],
      structuredContent: {
        isRunning,
        messages: messages.map((msg) => ({
          messageId: msg.id,
          role: msg.role,
          parts: msg.parts,
          createdAt: dbMessages.find((db) => db.messageId === msg.id)?.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: "Failed to get messages", error: errorMessage });
    return {
      content: [{ type: "text", text: `Error getting messages: ${errorMessage}` }],
      isError: true,
    };
  }
}
