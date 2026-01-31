import "server-only";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { clientMessagePayloadSchema, type ClientMessagePayload } from "@/ai/messageUtilsClient";
import { initStudyStatReporter } from "@/ai/tools/stats";
import { executeBaseAgentRequest } from "@/app/(study)/agents/baseAgentRequest";
import { createFastInsightAgentConfig } from "@/app/(study)/agents/configs/fastInsightAgentConfig";
import { createPlanModeAgentConfig } from "@/app/(study)/agents/configs/planModeAgentConfig";
import { createProductRnDAgentConfig } from "@/app/(study)/agents/configs/productRnDAgentConfig";
import { createStudyAgentConfig } from "@/app/(study)/agents/configs/studyAgentConfig";
import { UserChatContext } from "@/app/(study)/context/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { detectInputLanguage } from "@/lib/textUtils";
import { AnalystKind } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getUserTokens } from "@/tokens/lib";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { generateId, UIMessageStreamWriter } from "ai";
import { Locale } from "next-intl";

// Use the same schema as the API route
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

    const { userChatToken, message, attachments } = args;
    const userId = context.userId;

    const logger = rootLogger.child({
      mcp: "atypica-study-mcp",
      tool: "send_message",
      userId,
      userChatToken,
    });

    // Verify ownership and fetch full userChat - same logic as route.ts
    const userChat = await prisma.userChat.findUnique({
      where: { token: userChatToken, kind: "study" },
      include: { analyst: true },
    });

    if (!userChat) {
      throw new Error("Study not found");
    }

    if (userChat.userId !== userId) {
      throw new Error("Unauthorized: Study does not belong to user");
    }

    if (!userChat.analyst) {
      throw new Error("Study does not have an analyst");
    }

    const studyUserChatId = userChat.id;

    // Save message - same logic as route.ts
    // If message.id exists, it updates existing message with tool result
    // If message.id is undefined, it creates new message
    const messageId = message.id ?? generateId();
    await persistentAIMessageToDB({
      mode: "append",
      userChatId: studyUserChatId,
      message: {
        id: messageId,
        role: message.role,
        parts: [message.lastPart],
        metadata: message.metadata,
      },
      attachments,
    });

    logger.info({
      msg: "Message saved via MCP",
      messageId,
      role: message.role,
      hasAttachments: !!attachments?.length,
    });

    // =============================================================================
    // Execute AI推理 - same logic as route.ts
    // =============================================================================

    // Detect locale - same logic as route.ts
    const locale: Locale = await detectInputLanguage({
      text: [message.lastPart].map((part) => (part.type === "text" ? part.text : "")).join(""),
      fallbackLocale:
        userChat.analyst.locale && VALID_LOCALES.includes(userChat.analyst.locale as Locale)
          ? (userChat.analyst.locale as Locale)
          : undefined,
    });

    // Get teamId - same logic as route.ts
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const teamId = user.teamIdAsMember;

    // Check quota - same logic as route.ts
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
          role: message.role,
          status: "saved_no_ai",
          reason: "quota_exceeded",
        },
      };
    }

    // Initialize statistics reporter - same logic as route.ts
    const { statReport } = initStudyStatReporter({
      userId,
      studyUserChatId,
      logger,
    });

    // Create abort controllers - same logic as route.ts
    const toolAbortController = new AbortController();
    const studyAbortController = new AbortController();

    const agentContext = {
      userId,
      teamId,
      studyUserChatId,
      analyst: userChat.analyst,
      userChatContext: userChat.context as UserChatContext,
      locale,
      logger,
      statReport,
      toolAbortController,
      studyAbortController,
    };

    // Create dummy streamWriter for MCP (no streaming needed)
    const dummyWriter: UIMessageStreamWriter = {
      write: () => {}, // Do nothing
    } as unknown as UIMessageStreamWriter;

    try {
      // Execute agent based on analyst.kind - same logic as route.ts
      if (!userChat.analyst.kind) {
        // Plan Mode - Intent Layer for research planning
        const config = await createPlanModeAgentConfig(agentContext);
        await executeBaseAgentRequest(agentContext, config, dummyWriter);
      } else if (userChat.analyst.kind === AnalystKind.productRnD) {
        const config = await createProductRnDAgentConfig(agentContext);
        await executeBaseAgentRequest(agentContext, config, dummyWriter);
      } else if (userChat.analyst.kind === AnalystKind.fastInsight) {
        const config = await createFastInsightAgentConfig(agentContext);
        await executeBaseAgentRequest(agentContext, config, dummyWriter);
      } else {
        const config = await createStudyAgentConfig(agentContext);
        await executeBaseAgentRequest(agentContext, config, dummyWriter);
      }

      logger.info({
        msg: "AI response completed via MCP",
        messageId,
        studyUserChatId,
      });

      return {
        content: [
          {
            type: "text",
            text: `Message sent and AI response completed. Use get_messages to retrieve the conversation.`,
          },
        ],
        structuredContent: {
          messageId,
          role: message.role,
          status: "completed",
          attachmentCount: attachments?.length ?? 0,
        },
      };
    } catch (aiError) {
      const aiErrorMessage = aiError instanceof Error ? aiError.message : String(aiError);
      logger.error({
        msg: "AI execution failed via MCP",
        error: aiErrorMessage,
        messageId,
        studyUserChatId,
      });

      return {
        content: [
          {
            type: "text",
            text: `Message saved, but AI execution failed: ${aiErrorMessage}. The message has been saved and you can retry later.`,
          },
        ],
        structuredContent: {
          messageId,
          role: message.role,
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
