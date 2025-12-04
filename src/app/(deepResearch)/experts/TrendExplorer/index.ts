import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { scoutSocialTrendsTool } from "@/ai/tools/experts/scoutSocialTrends";
import { webSearchTool as createWebSearchTool } from "@/ai/tools/experts/webSearch";
import { stepCountIs, streamText, ToolSet } from "ai";
import { ExpertExecutor, ExpertStreamTextResult } from "../types";
import trendExplorerSystemPrompt from "./prompt";

const MAX_STEPS = 10; // More steps for comprehensive trend exploration

export const trendExplorerExpert: ExpertExecutor = async ({
  query,
  userId,
  locale,
  logger,
  // statReport,  // TODO: consume tokens with statReport
  abortSignal,
  forwardStreamChunk,
}) => {
  // Create web search tool with perplexity provider for DeepResearch context
  const webSearchTool = createWebSearchTool({
    provider: "perplexity",
    statReport: async () => {
      // No-op stat reporter for DeepResearch context
    },
  });

  // Use the actual scoutSocialTrendsTool with proper configuration
  const socialTrendsTool = scoutSocialTrendsTool({
    userId,
    locale,
    abortSignal: abortSignal ?? AbortSignal.timeout(0), // Provide a default if undefined
    statReport: async () => {
      // No-op stat reporter for DeepResearch context
    },
    logger,
  });

  // Build tools object
  const allTools: ToolSet = {
    webSearch: webSearchTool,
    scoutSocialTrends: socialTrendsTool,
  };

  const promise = new Promise<ExpertStreamTextResult>((resolve, reject) => {
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
      onChunk: async ({ chunk }) => {
        if (forwardStreamChunk) {
          forwardStreamChunk(chunk);
        }
      },
      onError: async ({ error }) => {
        logger.error(`trendExplorerExpert streamText onError: ${(error as Error).message}`);
        reject(error);
      },
      onFinish: async ({ text, usage, sources }) => {
        logger.info("trendExplorerExpert streamText onFinish");
        resolve({ text, usage, sources });
      },
    });

    response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  return await promise;
};
