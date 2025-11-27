import "server-only";

import { rootLogger } from "@/lib/logging";
import { DeepResearchInput, DeepResearchOutput } from "./types";
import { StreamChunkCallback } from "@/lib/mcp/types";
import { ExpertName } from "./experts/types";
import { resolveExpert } from "./experts";
/**
 * Executes deep research using Grok model with web search and X search tools
 * Streams the response in real-time via callback and returns final result
 * 
 * @param query - The research query
 * @param abortSignal - Optional abort signal for cancellation
 * @param onStreamChunk - Optional callback for streaming chunks to MCP client
 */
export async function executeDeepResearch({
  query,
  expert,
  abortSignal,
  onStreamChunk,
}: DeepResearchInput & {
  abortSignal?: AbortSignal;
  onStreamChunk?: StreamChunkCallback;
}): Promise<DeepResearchOutput> {
  const logger = rootLogger.child({ tool: "deepresearch", query: query.substring(0, 100) });

  try {
    const { name: resolvedExpert, executor } = resolveExpert(expert);

    logger.info(
      { expert: resolvedExpert },
      "Starting deep research with streaming",
    );
    
    const response = await executor({ query, abortSignal });

    if (onStreamChunk) {
      // Use fullStream to get all event types (text, reasoning, sources, etc.)
      for await (const chunk of response.fullStream) {
        await onStreamChunk(chunk);
      }
    } else {
      // No streaming callback - just drain the stream
      for await (const _chunk of response.textStream) {
        // Consume stream
        logger.info("onStreamChunk not provided, draining stream");
      }
    }

    // Get final result with all metadata
    const result = await response;
    const resultText = await result.text;
    const reasoningText = (await result.reasoningText) ?? "";
    const usage = await result.usage;
    const sources = await result.sources;

    // Combine reasoning text if available
    const finalResult = reasoningText ? `${reasoningText}\n\n${resultText}` : resultText;

    logger.info(
      {
        textLength: finalResult.length,
        hasReasoning: !!reasoningText,
        sourcesCount: sources.length,
        usage,
      },
      "Deep research completed",
    );

    return {
      result: finalResult,
    };
  } catch (error) {
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
    
    logger.error(errorDetails, "Deep research failed with detailed error information");
    throw error;
  }
}

