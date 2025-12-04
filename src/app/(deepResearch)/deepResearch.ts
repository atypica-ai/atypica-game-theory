import "server-only";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { StatReporter } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { StreamChunkCallback } from "@/lib/mcp/types";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { generateId, TextStreamPart, ToolSet } from "ai";
import { getLocale } from "next-intl/server";
import { resolveExpert } from "./experts";
import { DeepResearchInput, DeepResearchOutput } from "./types";

/**
 * Executes deep research using Grok model with web search and X search tools
 * Streams the response in real-time via callback and returns final result
 * Creates and manages UserChat with backgroundToken for concurrency control
 *
 * @param query - The research query
 * @param userId - The user ID to associate the chat with
 * @param abortSignal - Optional abort signal for cancellation
 * @param onStreamChunk - Optional callback for streaming chunks to MCP client
 */
export async function executeDeepResearch({
  query,
  userId,
  expert,
  abortSignal,
  onStreamChunk,
}: DeepResearchInput & {
  userId: number;
  abortSignal: AbortSignal;
  onStreamChunk?: StreamChunkCallback;
}): Promise<DeepResearchOutput> {
  const locale = await getLocale();
  const logger = rootLogger.child({ tool: "deepresearch", query: query.substring(0, 100), userId });
  const statReport: StatReporter = async (dimension, value, extra) => {
    logger.info({
      msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
      extra,
    });
  };

  // Create UserChat for this research session
  const userChat = await createUserChat({
    userId,
    title: truncateForTitle(query, { maxDisplayWidth: 80, suffix: "..." }),
    kind: "misc",
  });
  const userChatId = userChat.id;

  // Set backgroundToken for concurrency control (similar to interviewChat pattern)
  const backgroundToken = new Date().valueOf().toString();
  await prisma.userChat.update({
    where: { id: userChatId },
    data: { backgroundToken },
  });

  const toolLogger = logger.child({ userChatId, backgroundToken });

  try {
    // Save user query message with backgroundToken verification
    await prisma.$transaction(async (tx) => {
      // Verify backgroundToken matches before saving
      await tx.userChat.findUniqueOrThrow({
        where: { id: userChatId, backgroundToken },
      });
      await persistentAIMessageToDB({
        userChatId,
        message: {
          id: generateId(),
          role: "user",
          parts: [{ type: "text", text: query }],
        },
        tx,
      });
    });

    const { name: resolvedExpert, executor } = resolveExpert(expert);

    toolLogger.info({ expert: resolvedExpert, msg: "Starting deep research with streaming" });

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
      abortSignal,
      forwardStreamChunk: onStreamChunk
        ? (chunk: TextStreamPart<ToolSet>) => {
            waitUntil(
              Promise.race([
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 30 * 1000)),
                onStreamChunk(chunk).catch((error) => {
                  logger.error(
                    `${resolvedExpert} streamText onStreamChunk error: ${error.message}`,
                  );
                }),
              ]),
            );
          }
        : undefined,
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

    // Save assistant response with backgroundToken verification
    await prisma.$transaction(async (tx) => {
      // Verify backgroundToken matches before saving
      await tx.userChat.findUniqueOrThrow({
        where: { id: userChatId, backgroundToken },
      });
      await persistentAIMessageToDB({
        userChatId,
        message: {
          id: generateId(),
          role: "assistant",
          parts: [{ type: "text", text: finalResult }],
        },
        tx,
      });
    });

    // Clear backgroundToken at the end
    try {
      await prisma.userChat.update({
        where: { id: userChatId, backgroundToken },
        data: { backgroundToken: null },
      });
    } catch (error) {
      toolLogger.error({ error: (error as Error).message }, "Error clearing backgroundToken");
    }
    return {
      result: finalResult,
    };
  } catch (error) {
    // Clear backgroundToken on error
    try {
      await prisma.userChat.update({
        where: { id: userChatId, backgroundToken },
        data: { backgroundToken: null },
      });
    } catch (clearError) {
      toolLogger.error(
        { error: (clearError as Error).message },
        "Error clearing backgroundToken on error",
      );
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
