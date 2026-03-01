import "server-only";

import {
  appendStepToStreamingMessage,
  persistentAIMessageToDB,
  prepareMessagesForStreaming,
} from "@/ai/messageUtils";
import { AgentToolConfigArgs, PlainTextToolResult, StatReporter } from "@/ai/tools/types";
import { StreamChunkCallback } from "@/lib/mcp/types";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { failUserChatRun, startManagedRun } from "@/lib/userChat/runtime";
import { waitUntil } from "@vercel/functions";
import { generateId, StepResult, tool, ToolSet } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { resolveExpert } from "./experts";
import {
  DeepResearchInput,
  deepResearchInputSchema,
  DeepResearchOutput,
  deepResearchOutputSchema,
} from "./types";

/**
 * Executes deep research using Grok model with web search and X search tools
 * Streams the response in real-time via callback and returns final result
 * Creates and manages UserChat with runtime management for concurrency control
 *
 * @param query - The research query
 * @param userId - The user ID to associate the chat with
 * @param abortSignal - Optional abort signal for cancellation
 * @param onStreamChunk - Optional callback for streaming chunks to MCP client
 */
async function executeDeepResearch({
  query,
  userId,
  expert,
  locale,
  logger,
  statReport,
  externalAbortSignal,
  onStreamChunk,
}: DeepResearchInput & {
  userId: number;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  externalAbortSignal: AbortSignal;
  onStreamChunk?: StreamChunkCallback;
}): Promise<DeepResearchOutput> {
  // Create UserChat for this research session
  const userChat = await createUserChat({
    userId,
    title: truncateForTitle(query, { maxDisplayWidth: 80, suffix: "..." }),
    kind: "misc",
  });
  const userChatId = userChat.id;

  // Start managed run — writes runId to DB, starts watcher, returns abort signal
  const {
    runId,
    abortSignal: managedAbortSignal,
    cleanup: cleanupRun,
  } = await startManagedRun({ userChatId, logger });

  // Combine external abort (from MCP/tool caller) and managed abort (from watcher)
  const combinedAbortSignal = AbortSignal.any([externalAbortSignal, managedAbortSignal]);

  const toolLogger = logger.child({ userChatId, runId });

  try {
    // Save user query message
    await persistentAIMessageToDB({
      mode: "append",
      userChatId,
      message: {
        id: generateId(),
        role: "user",
        parts: [{ type: "text", text: query }],
      },
    });

    const { name: resolvedExpert, executor } = resolveExpert(expert);

    toolLogger.info({ expert: resolvedExpert, msg: "Starting deep research with streaming" });

    // 准备 streamingMessage（使用 prepareMessagesForStreaming 保持架构一致）
    const { streamingMessage } = await prepareMessagesForStreaming(userChatId, {
      tools: {} as ToolSet, // DeepResearch 的 tools 在 expert 内部，这里传空对象
    });

    // 准备 onStepFinish callback
    const onStepFinish = async (step: StepResult<ToolSet>) => {
      // 1. 在外部累积 step 到 streamingMessage
      appendStepToStreamingMessage(streamingMessage, step);

      // 2. 立即保存消息
      await persistentAIMessageToDB({
        mode: "override",
        userChatId,
        message: streamingMessage,
      });

      // 3. MCP 模式：发送 notification
      if (onStreamChunk) {
        // 提取所有 text parts 并发送
        const textParts = streamingMessage.parts
          .filter((part) => part.type === "text")
          .map((part) => (part.type === "text" ? part.text : ""))
          .join("\n");

        if (textParts) {
          const sendNotification = onStreamChunk({
            type: "text-delta",
            id: streamingMessage.id,
            text: textParts,
          }).catch((error) => {
            toolLogger.error(`${resolvedExpert} onStepFinish notification error: ${error.message}`);
          });
          waitUntil(
            Promise.race([
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 30 * 1000)),
              sendNotification,
            ]),
          );
        }
      }
    };

    const {
      text: resultText,
      usage,
      sources,
    } = await executor({
      query,
      userId,
      locale,
      logger: toolLogger,
      statReport,
      abortSignal: combinedAbortSignal,
      streamingMessageId: streamingMessage.id,
      onStepFinish,
    });

    const finalResult = resultText;

    toolLogger.info(
      {
        textLength: finalResult.length,
        sourcesCount: sources.length,
        usage,
      },
      "Deep research completed",
    );

    // ⚠️ 不需要再次保存 assistant 消息，已经在 onStepFinish 里保存了

    await cleanupRun();
    return {
      plainText: finalResult,
    };
  } catch (error) {
    // Record error and clear runId atomically
    try {
      await failUserChatRun({ userChatId, runId, error: (error as Error).message });
    } catch {
      // failUserChatRun itself failed — don't block
    }

    // Enhanced error logging for AI SDK errors
    const errorDetails: Record<string, string> = {
      errorMessage: (error as Error).message,
      errorName: (error as Error).name,
    };

    // Check if it's an AI SDK API call error with additional details
    if (error && typeof error === "object" && "statusCode" in error) {
      const apiError = error as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      errorDetails.statusCode = apiError.statusCode;
      errorDetails.url = apiError.url;
      errorDetails.responseBody = apiError.responseBody;
      errorDetails.requestBodyValues = apiError.requestBodyValues;
      errorDetails.isRetryable = apiError.isRetryable;
      // Check if tool_choice was set
      if (apiError.requestBodyValues?.tool_choice) {
        errorDetails.toolChoiceInRequest = apiError.requestBodyValues.tool_choice;
      }
    }

    toolLogger.error(errorDetails, "Deep research failed with detailed error information");
    throw error;
  }
}

export const deepResearchTool = ({
  userId,
  locale,
  abortSignal,
  statReport,
  logger,
  onStreamChunk,
}: {
  userId: number;
  onStreamChunk?: StreamChunkCallback;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Performs deep research on a query using advanced AI with web search and X (Twitter) search capabilities. Returns comprehensive research results.",
    inputSchema: deepResearchInputSchema,
    outputSchema: deepResearchOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ query, expert }) => {
      return await executeDeepResearch({
        // tool call input
        query: query,
        expert: expert,
        // tool init params
        userId,
        locale,
        logger,
        statReport,
        externalAbortSignal: abortSignal,
        onStreamChunk,
      });
    },
  });
