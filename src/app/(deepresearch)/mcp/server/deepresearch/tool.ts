import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { xai } from "@ai-sdk/xai";
import { streamText } from "ai";
import { DeepResearchInput, DeepResearchOutput } from "./types";

/**
 * Callback type for streaming chunks to the MCP client
 */
export type StreamChunkCallback = (chunk: {
  type: "text-delta" | "reasoning-delta" | "source" | "finish";
  text?: string;
  source?: { id: string; url: string; title?: string };
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}) => Promise<void>;

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

    // Use grok-4-1-fast-non-reasoning model when available (fallback handled in provider)
    const model = llm("grok-4-1-fast-non-reasoning");

    const response = streamText({
      model,
      providerOptions: defaultProviderOptions,
      tools: {
        web_search: xai.tools.webSearch({
          enableImageUnderstanding: true,
        }),
        x_search: xai.tools.xSearch({
          enableImageUnderstanding: true,
          enableVideoUnderstanding: true,
        }),
      },
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
      abortSignal,
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
    logger.error({ error: (error as Error).message }, "Deep research failed");
    throw error;
  }
}

