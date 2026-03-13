import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { webSearchTool as createWebSearchTool } from "@/ai/tools/experts/webSearch";
import { calculateStepTokensUsage, TReduceTokens } from "@/ai/usage";
import { scoutSocialTrendsTool } from "@/app/(study)/tools";
import { stepCountIs, streamText, ToolSet } from "ai";
import { ExpertExecutor, ExpertStreamTextResult } from "../types";
import trendExplorerSystemPrompt from "./prompt";

const MAX_STEPS = 10; // More steps for comprehensive trend exploration

export const trendExplorerExpert: ExpertExecutor = async ({
  query,
  userId,
  locale,
  logger,
  statReport,
  abortSignal,
  // UI 流式输出
  streamWriter,
  streamingMessageId,
  onStepFinish: onStepFinishCallback,
}) => {
  // Create web search tool with perplexity provider for DeepResearch context
  const webSearchTool = createWebSearchTool({
    provider: "perplexity",
    statReport,
  });

  // Use the actual scoutSocialTrendsTool with proper configuration
  const socialTrendsTool = scoutSocialTrendsTool({
    userId,
    locale,
    abortSignal,
    statReport,
    logger,
  });

  // Build tools object
  const allTools: ToolSet = {
    webSearch: webSearchTool,
    scoutSocialTrends: socialTrendsTool,
  };
  const reduceTokens: TReduceTokens = {
    model: "gemini-3.1-pro",
    ratio: 2,
  };
  const promise = new Promise<ExpertStreamTextResult>((resolve, reject) => {
    const response = streamText({
      model: llm("gemini-3.1-pro"), // Using Gemini 2.5 Pro model for trend analysis
      system: trendExplorerSystemPrompt({ locale }),
      providerOptions: defaultProviderOptions(),
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
                content:
                  "You have reached the last allowed step. Please conclude your trend analysis with a comprehensive summary.",
              },
            ],
          };
        }
        // When nothing is returned, the default settings from the main config are used.
      },
      onStepFinish: async (step) => {
        // 统计 token
        const { tokens, extra } = calculateStepTokensUsage(step, { reduceTokens });
        await statReport("tokens", tokens, {
          reportedBy: "deepResearch trendExplorer",
          ...extra,
        });

        logger.info({
          msg: "TrendExplorer step finished",
          toolCalls: step.toolCalls.map((c) => c.toolName),
          usage: extra.usage,
        });

        // 调用外部的 callback，传递 step（外部负责 append 和保存）
        if (onStepFinishCallback) {
          await onStepFinishCallback(step);
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

    // UI 模式：桥接 streamWriter
    if (streamWriter && streamingMessageId) {
      streamWriter.merge(
        response.toUIMessageStream({
          generateMessageId: () => streamingMessageId,
        }),
      );
    }

    response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });

  return await promise;
};
