import "server-only";

import { createUniversalChatDirect } from "@/app/(universal)/lib";
import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const createChatInputSchema = z.object({
  content: z.string().min(1).describe("The initial user message to start the universal chat"),
});

export async function handleCreateChat(
  args: z.infer<typeof createChatInputSchema>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<CallToolResult> {
  try {
    const context = getMcpRequestContext();
    if (!context?.userId) {
      throw new Error("Missing userId in request context");
    }

    const { content } = args;
    const userId = context.userId;

    const logger = rootLogger.child({
      mcp: "atypica-universal-mcp",
      tool: "create_chat",
      userId,
    });

    const userChat = await createUniversalChatDirect({
      userId,
      role: "user",
      content,
    });

    logger.info({
      msg: "Universal chat created via MCP",
      chatId: userChat.id,
      token: userChat.token,
    });

    return {
      content: [
        {
          type: "text",
          text: `Universal chat created successfully. Token: ${userChat.token}`,
        },
      ],
      structuredContent: {
        token: userChat.token,
        chatId: userChat.id,
        status: "created",
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: "Failed to create universal chat", error: errorMessage });
    return {
      content: [{ type: "text", text: `Error creating chat: ${errorMessage}` }],
      isError: true,
    };
  }
}
