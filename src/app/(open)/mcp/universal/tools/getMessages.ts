import "server-only";

import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
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

export const getMessagesInputSchema = z.object({
  userChatToken: z.string().describe("The universal or study chat session token"),
  tail: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Max parts to return (from tail, most recent parts across all messages)"),
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

    const { userChatToken, tail } = args;
    const userId = context.userId;

    // Verify ownership and check background status — same filter as universal API
    const userChat = await prismaRO.userChat.findUnique({
      where: {
        token: userChatToken,
        userId,
        kind: { in: ["universal", "study"] },
      },
      select: { id: true, userId: true, backgroundToken: true },
    });

    if (!userChat) {
      throw new Error("Chat not found");
    }

    const isRunning = !!userChat.backgroundToken;

    const dbMessages = await prismaRO.chatMessage.findMany({
      where: { userChatId: userChat.id },
      orderBy: { id: "asc" },
    });

    let messages = await convertDBMessagesToAIMessages(dbMessages);

    if (tail !== undefined) {
      let remaining = tail;
      const result = [];
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const partsCount = msg.parts.length;

        if (remaining <= 0) break;

        if (remaining >= partsCount) {
          result.unshift(msg);
          remaining -= partsCount;
        } else {
          result.unshift({
            ...msg,
            parts: msg.parts.slice(-remaining),
          });
          break;
        }
      }
      messages = result;
    }

    let messagesText = messages
      .map((msg) => {
        const textParts = msg.parts.filter((p) => p.type === "text").map((p) => p.text);
        return `[${msg.role}] ${textParts.join("")}`;
      })
      .join("\n");

    const maxLength = 3000;
    if (messagesText.length > maxLength) {
      messagesText = "...\n" + messagesText.slice(-maxLength);
    }

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
