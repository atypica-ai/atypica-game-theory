import "server-only";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { clientMessagePayloadSchema, type ClientMessagePayload } from "@/ai/messageUtilsClient";
import { initStudyStatReporter } from "@/ai/tools/stats";
import { executeBaseAgentRequest } from "@/app/(study)/agents/baseAgentRequest";
import { createFastInsightAgentConfig } from "@/app/(study)/agents/configs/fastInsightAgentConfig";
import { createPlanModeAgentConfig } from "@/app/(study)/agents/configs/planModeAgentConfig";
import { createProductRnDAgentConfig } from "@/app/(study)/agents/configs/productRnDAgentConfig";
import { createStudyAgentConfig } from "@/app/(study)/agents/configs/studyAgentConfig";
import { AnalystKind } from "@/app/(study)/context/types";
import { saveAnalystFromPlan } from "@/app/(study)/study/lib";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import { VALID_LOCALES } from "@/i18n/routing";
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
import { generateId, ToolUIPart } from "ai";
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

    const { userChatToken, message: newMessage, attachments } = args;
    const userId = context.userId;

    const logger = rootLogger.child({
      mcp: "atypica-study-mcp",
      tool: "send_message",
      userId,
      userChatToken,
    });

    // 这个要在 prisma.userChat.findUnique 之前执行，因为会更新 analyst.kind
    if (
      newMessage.lastPart.type === `tool-${StudyToolName.makeStudyPlan}` &&
      newMessage.lastPart.state === "output-available"
    ) {
      const toolPart = newMessage.lastPart as Extract<
        ToolUIPart<Pick<StudyUITools, StudyToolName.makeStudyPlan>>,
        { state: "output-available" }
      >;
      if (toolPart.input && toolPart.output.confirmed) {
        await saveAnalystFromPlan({
          userId,
          userChatToken,
          ...toolPart.input,
        });
      }
    }

    // Verify ownership and fetch full userChat - same logic as route.ts
    const userChat = await prisma.userChat.findUnique({
      where: {
        token: userChatToken,
        kind: "study",
      },
    });

    if (!userChat) {
      throw new Error("Study not found");
    }

    if (userChat.userId !== userId) {
      throw new Error("Unauthorized: Study does not belong to user");
    }

    const studyUserChatId = userChat.id;

    // Save message - same logic as route.ts
    // If message.id exists, it updates existing message with tool result
    // If message.id is undefined, it creates new message
    const messageId = newMessage.id ?? generateId();
    await persistentAIMessageToDB({
      mode: "append",
      userChatId: studyUserChatId,
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

    // =============================================================================
    // Execute AI推理 - same logic as route.ts
    // =============================================================================

    // Detect locale - same logic as route.ts
    const locale: Locale = await detectInputLanguage({
      text: [newMessage.lastPart].map((part) => (part.type === "text" ? part.text : "")).join(""),
      fallbackLocale:
        userChat.context.defaultLocale && VALID_LOCALES.includes(userChat.context.defaultLocale)
          ? userChat.context.defaultLocale
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
          role: newMessage.role,
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

    const agentContext = {
      userId,
      teamId,
      studyUserChatId,
      userChatContext: userChat.context,
      locale,
      logger,
      statReport,
    };

    const configParams = { ...agentContext };

    try {
      // Execute agent based on analyst.kind - same logic as route.ts
      // No streamWriter needed for MCP
      if (!userChat.context.analystKind) {
        await executeBaseAgentRequest(agentContext, (toolAbortSignal) =>
          createPlanModeAgentConfig({ ...configParams, toolAbortSignal }),
        );
      } else if (userChat.context.analystKind === AnalystKind.productRnD) {
        await executeBaseAgentRequest(agentContext, (toolAbortSignal) =>
          createProductRnDAgentConfig({ ...configParams, toolAbortSignal }),
        );
      } else if (userChat.context.analystKind === AnalystKind.fastInsight) {
        await executeBaseAgentRequest(agentContext, (toolAbortSignal) =>
          createFastInsightAgentConfig({ ...configParams, toolAbortSignal }),
        );
      } else {
        await executeBaseAgentRequest(agentContext, (toolAbortSignal) =>
          createStudyAgentConfig({ ...configParams, toolAbortSignal }),
        );
      }

      logger.info({
        msg: "AI execution started via MCP",
        messageId,
        studyUserChatId,
      });

      return {
        content: [
          {
            type: "text",
            text: `Message sent and AI execution started. Use get_messages to monitor progress and retrieve the conversation.`,
          },
        ],
        structuredContent: {
          messageId,
          role: newMessage.role,
          status: "running",
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
