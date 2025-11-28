import "server-only";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { truncateForTitle } from "@/lib/textUtils";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { DeepResearchInput, DeepResearchOutput } from "./types";
import { StreamChunkCallback } from "@/lib/mcp/types";
import { ExpertName } from "./experts/types";
import { resolveExpert } from "./experts";
import { generateId, UIMessage } from "ai";

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
  abortSignal?: AbortSignal;
  onStreamChunk?: StreamChunkCallback;
}): Promise<DeepResearchOutput> {
  const logger = rootLogger.child({ tool: "deepresearch", query: query.substring(0, 100), userId });

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

    toolLogger.info(
      { expert: resolvedExpert },
      "Starting deep research with streaming",
    );
    
    const response = await executor({ query, abortSignal, userId });

    if (onStreamChunk) {
      // Use fullStream to get all event types (text, reasoning, sources, etc.)
      for await (const chunk of response.fullStream) {
        await onStreamChunk(chunk);
      }
    } else {
      // No streaming callback - just drain the stream
      for await (const _chunk of response.textStream) {
        // Consume stream
        toolLogger.info("onStreamChunk not provided, draining stream");
      }
    }

    // Get final result with all metadata
    const result = await response;
    const resultText = await result.text;
    const usage = await result.usage;
    const sources = await result.sources;

    // Combine reasoning text if available
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
      toolLogger.error(
        { error: (error as Error).message },
        "Error clearing backgroundToken",
      );
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
    const errorDetails: Record<string, any> = {
      errorMessage: (error as Error).message,
      errorName: (error as Error).name,
    };
    
    // Check if it's an AI SDK API call error with additional details
    if (error && typeof error === "object" && "statusCode" in error) {
      const apiError = error as any;
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

