import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { stepCountIs, streamText } from "ai";
import { xai } from "@ai-sdk/xai";
import { DeepResearchInput, DeepResearchOutput } from "../types";
import { StreamChunkCallback } from "@/lib/mcp/types";

const MAX_STEPS = 20;

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
  abortSignal,
  onStreamChunk,
}: DeepResearchInput & {
  abortSignal?: AbortSignal;
  onStreamChunk?: StreamChunkCallback;
}): Promise<DeepResearchOutput> {
  const logger = rootLogger.child({ tool: "deepresearch", query: query.substring(0, 100) });

  try {
    logger.info("Starting deep research with streaming");
    
    // Create XAI instance with debug logging
    // const xaiClient = createXai({
    //   apiKey: process.env.XAI_API_KEY,
    //   fetch: proxiedFetch,
    // });
    
    // Build tools object with error handling
    const allTools: Record<string, any> = {
      x_search : xai.tools.xSearch({
        enableImageUnderstanding: true,
        enableVideoUnderstanding: true,
      }),
      web_search : xai.tools.webSearch({
        enableImageUnderstanding: true,
      }),
    };
    
    const response = streamText({
      model: llm("grok-4"),
      providerOptions: defaultProviderOptions,
      tools: allTools,
      toolChoice: "auto",
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
      abortSignal,
      stopWhen: stepCountIs(MAX_STEPS),
    });

    // Stream text chunks in real-time if callback provided
    let accumulatedText = "";
    let accumulatedReasoning = "";

    if (onStreamChunk) {
      // Use fullStream to get all event types (text, reasoning, sources, etc.)
      for await (const chunk of response.fullStream) {
        if (chunk.type === "text-delta") {
          // Text delta chunk
          accumulatedText += chunk.text;
          await onStreamChunk({
            type: "text-delta",
            text: chunk.text,
          });
        } else if (chunk.type === "reasoning-delta") {
          // Reasoning delta chunk
          accumulatedReasoning += chunk.text;
          await onStreamChunk({
            type: "reasoning-delta",
            text: chunk.text,
          });
        } else if (chunk.type === "source") {
          // Source chunk - only handle URL sources
          if (chunk.sourceType === "url") {
            await onStreamChunk({
              type: "source",
              source: {
                id: chunk.id,
                url: chunk.url,
                title: chunk.title,
              },
            });
          }
        }
        // Other chunk types (tool-call, tool-result, etc.) are logged but not streamed
      }
    } else {
      // No streaming callback - just drain the stream
      for await (const _chunk of response.textStream) {
        // Consume stream
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

    // Send finish notification with usage stats
    if (onStreamChunk) {
      await onStreamChunk({
        type: "finish",
        usage: {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
        },
      });
    }

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
      
      // Log the tools that were sent (if available)
      if (apiError.requestBodyValues?.tools) {
        errorDetails.toolsInRequest = Array.isArray(apiError.requestBodyValues.tools)
          ? apiError.requestBodyValues.tools.length
          : Object.keys(apiError.requestBodyValues.tools || {}).length;
        errorDetails.toolNamesInRequest = Array.isArray(apiError.requestBodyValues.tools)
          ? apiError.requestBodyValues.tools.map((t: any) => t?.function?.name || t?.type)
          : Object.keys(apiError.requestBodyValues.tools || {});
      }
      
      // Check if tool_choice was set
      if (apiError.requestBodyValues?.tool_choice) {
        errorDetails.toolChoiceInRequest = apiError.requestBodyValues.tool_choice;
      }
    }
    
    logger.error(errorDetails, "Deep research failed with detailed error information");
    throw error;
  }
}

