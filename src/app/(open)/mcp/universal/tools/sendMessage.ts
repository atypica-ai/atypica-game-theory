import "server-only";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { clientMessagePayloadSchema, type ClientMessagePayload } from "@/ai/messageUtilsClient";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import { executeUniversalAgent } from "@/app/(universal)/agent";
import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { detectInputLanguage } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { generateId } from "ai";
import type { Locale } from "next-intl";

export const sendMessageInputSchema = clientMessagePayloadSchema;

export async function handleSendMessage(
  args: ClientMessagePayload,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<CallToolResult> {
  try {
    const context = getMcpRequestContext();
    if (!context?.userId) {
      throw new Error("Missing userId in request context");
    }

    const { userChatToken, message: newMessage, attachments } = args;
    const userId = context.userId;

    const logger = rootLogger.child({
      mcp: "atypica-universal-mcp",
      tool: "send_message",
      userId,
      userChatToken,
    });

    // Verify ownership and fetch userChat — same filter as universal API route
    const userChat = await prisma.userChat.findUnique({
      where: {
        token: userChatToken,
        userId,
        kind: {
          in: ["universal", "study"],
        },
      },
    });

    if (!userChat) {
      throw new Error("Chat not found");
    }

    const universalChatId = userChat.id;

    // Save message
    const messageId = newMessage.id ?? generateId();
    await persistentAIMessageToDB({
      mode: "append",
      userChatId: universalChatId,
      message: {
        id: messageId,
        role: newMessage.role,
        parts: [newMessage.lastPart],
        metadata: newMessage.metadata,
      },
      attachments,
    });

    logger.info({
      msg: "Message saved via MCP",
      messageId,
      role: newMessage.role,
      hasAttachments: !!attachments?.length,
    });

    // Detect locale
    const locale: Locale = await detectInputLanguage({
      text: [newMessage.lastPart].map((part) => (part.type === "text" ? part.text : "")).join(""),
    });

    // Check quota
    const { balance } = await getUserTokens({ userId });
    if (balance !== "Unlimited" && balance <= 0) {
      logger.warn({ msg: "User out of quota", userId, balance });
      return {
        content: [
          {
            type: "text",
            text: "Message saved, but AI response skipped due to insufficient quota. Please upgrade your plan.",
          },
        ],
        structuredContent: {
          messageId,
          role: newMessage.role,
          status: "saved_no_ai",
          reason: "quota_exceeded",
        },
      };
    }

    const { statReport } = initGenericUserChatStatReporter({
      userId,
      userChatId: universalChatId,
      logger,
    });

    try {
      await executeUniversalAgent(
        {
          userId,
          userChat: { id: userChat.id, token: userChat.token, extra: userChat.extra, context: userChat.context },
          statReport,
          logger,
          locale,
        },
        undefined,
      );

      logger.info({
        msg: "Universal agent completed via MCP",
        messageId,
        universalChatId,
      });

      return {
        content: [
          {
            type: "text",
            text: "Message sent and agent completed. Use get_messages to retrieve the conversation.",
          },
        ],
        structuredContent: {
          messageId,
          role: newMessage.role,
          status: "completed",
          attachmentCount: attachments?.length ?? 0,
        },
      };
    } catch (aiError) {
      const aiErrorMessage = aiError instanceof Error ? aiError.message : String(aiError);
      logger.error({
        msg: "Universal agent execution failed via MCP",
        error: aiErrorMessage,
        messageId,
        universalChatId,
      });

      return {
        content: [
          {
            type: "text",
            text: `Message saved, but agent execution failed: ${aiErrorMessage}. The message has been saved and you can retry later.`,
          },
        ],
        structuredContent: {
          messageId,
          role: newMessage.role,
          status: "ai_failed",
          error: aiErrorMessage,
        },
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: "Failed to send message", error: errorMessage });
    return {
      content: [{ type: "text", text: `Error sending message: ${errorMessage}` }],
      isError: true,
    };
  }
}
