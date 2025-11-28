import "server-only";

import { streamText } from "ai";
import { llm } from "@/ai/provider";
import trendExplorerSystemPrompt from "./prompt";
import { defaultProviderOptions } from "@/ai/provider";
import { stepCountIs } from "ai";
import { tool } from "ai";
import { webSearchPerplexitySonarProInputSchema, webSearchPerplexitySonarProOutputSchema } from "@/ai/tools/experts/webSearchPerplexitySonarPro/types";
import { scoutSocialTrendsTool } from "@/ai/tools/experts/scoutSocialTrends";
import { generateText } from "ai";
import { rootLogger } from "@/lib/logging";
import { PlainTextToolResult } from "@/ai/tools/types";
import { getLocale } from "next-intl/server";

const MAX_STEPS = 12; // More steps for comprehensive trend exploration

// Simplified web search function for DeepResearch context (without studyUserChatId dependency)
async function webSearchPerplexitySonarProSimple({ query }: { query: string }): Promise<{ answer: string; plainText: string }> {
  try {
    const { text, sources } = await generateText({
      model: llm("sonar-pro"),
      prompt: query,
      providerOptions: {
        perplexity: {
          return_images: false,
        },
      },
      maxOutputTokens: 2000,
    });
    
    // Create a plain text response that includes the answer and sources
    const answer = text + (sources && sources.length > 0 
      ? `\n\nSources:\n${sources.map((source, index) => {
          const url = 'url' in source ? source.url : source.id;
          return `[${index + 1}] ${url}`;
        }).join('\n')}`
      : '');
    
    return {
      answer: answer,
      plainText: answer,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Perplexity web search failed: ${errorMessage}`);
  }
}

export const trendExplorerExpert = async ({ 
  query, 
  abortSignal,
  userId,
}: { 
  query: string;
  abortSignal?: AbortSignal;
  userId: number;
}) => {
  const logger = rootLogger.child({ expert: "trendExplorer", userId });
  const locale = await getLocale();

  // Create simplified web search tool for DeepResearch context
  const webSearchTool = tool({
    description:
      "Search the internet for comprehensive information about trends, patterns, and long-term developments. Provides real-time web search with detailed citations. Use this to understand broader context, historical patterns, and long-term trends related to the topic.",
    inputSchema: webSearchPerplexitySonarProInputSchema,
    outputSchema: webSearchPerplexitySonarProOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ query: searchQuery }) => {
      logger.debug({ query: searchQuery }, "Executing web search");
      return await webSearchPerplexitySonarProSimple({ query: searchQuery });
    },
  });

  // Use the actual scoutSocialTrendsTool with proper configuration
  const socialTrendsTool = scoutSocialTrendsTool({
    userId,
    locale: locale as "en-US" | "zh-CN",
    abortSignal: abortSignal ?? AbortSignal.timeout(0), // Provide a default if undefined
    statReport: async () => {
      // No-op stat reporter for DeepResearch context
    },
    logger,
  });

  // Build tools object
  const allTools: Record<string, any> = {
    webSearch: webSearchTool,
    scoutSocialTrends: socialTrendsTool,
  };

  const response = streamText({
    model: llm("gemini-2.5-flash"), // Using Gemini 2.5 Flash model for trend analysis
    system: trendExplorerSystemPrompt,
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
    prepareStep: async ({ stepNumber, messages }) => {
      if (stepNumber === MAX_STEPS - 1) {
        return {
          toolChoice: "none", // shut down all tools at last step
          activeTools: [],
          messages: [
            ...messages,
            {
              role: "user",
              content: "You have reached the last allowed step. Please conclude your trend analysis with a comprehensive summary.",
            },
          ],
        };
      }
      // When nothing is returned, the default settings from the main config are used.
    },
  });

  return response;
};

