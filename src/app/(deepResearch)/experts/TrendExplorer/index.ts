import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { scoutSocialTrendsTool } from "@/ai/tools/experts/scoutSocialTrends";
import { webSearchPerplexitySonarProTool } from "@/ai/tools/experts/webSearchPerplexitySonarPro";
import { rootLogger } from "@/lib/logging";
import { stepCountIs, streamText } from "ai";
import { getLocale } from "next-intl/server";
import trendExplorerSystemPrompt from "./prompt";

const MAX_STEPS = 10; // More steps for comprehensive trend exploration

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
  const webSearchTool = webSearchPerplexitySonarProTool({
    locale: locale as "en-US" | "zh-CN",
    statReport: async () => {
      // No-op stat reporter for DeepResearch context
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
    model: llm("gemini-2.5-pro"), // Using Gemini 2.5 Pro model for trend analysis
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
        console.log("reached the last allowed step");
        return {
          toolChoice: "none", // shut down all tools at last step
          activeTools: [],
          messages: [
            ...messages,
            {
              role: "user",
              content:
                "You have reached the last allowed step. Please conclude your trend analysis with a comprehensive summary.",
            },
          ],
        };
      }
      // When nothing is returned, the default settings from the main config are used.
    },
  });

  return response;
};
