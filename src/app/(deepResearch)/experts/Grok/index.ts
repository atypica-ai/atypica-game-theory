import { defaultProviderOptions, llm } from "@/ai/provider";
import { calculateStepTokensUsage, TReduceTokens } from "@/ai/usage";
import { xai } from "@ai-sdk/xai";
import { stepCountIs, streamText, ToolSet, TypeValidationError } from "ai";
import { ExpertExecutor, ExpertStreamTextResult } from "../types";
import { deduplicateText } from "./fix";
import grokSystemPrompt from "./prompt";
const MAX_STEPS = 8;

export const grokExpert: ExpertExecutor = async ({
  query,
  // userId,
  locale,
  logger,
  statReport,
  abortSignal,
  // UI 流式输出
  streamWriter,
  streamingMessageId,
  onStepFinish: onStepFinishCallback,
}): Promise<ExpertStreamTextResult> => {
  // Build tools object with error handling
  const allTools: ToolSet = {
    x_search: xai.tools.xSearch({
      enableImageUnderstanding: true,
      enableVideoUnderstanding: true,
    }),
    web_search: xai.tools.webSearch({
      enableImageUnderstanding: true,
    }),
  } as ToolSet; // ⚠️ 强制转换一下格式，这两个 tool 只是 API 返回结果，实际不会调用，所以是没有 input 类型定义的
  const reduceTokens: TReduceTokens = {
    model: "grok-4-1-fast-non-reasoning",
    ratio: 2,
  };
  const promise = new Promise<ExpertStreamTextResult>((resolve, reject) => {
    const response = streamText({
      model: llm("grok-4-1-fast-non-reasoning"),
      system: grokSystemPrompt({ locale }),
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
                content: "You have reached the last allowed step. Please conclude the research.",
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
          reportedBy: "deepResearch grok",
          ...extra,
        });

        logger.info({
          msg: "Grok step finished",
          toolCalls: step.toolCalls.map((c) => c.toolName),
          usage: extra.usage,
        });

        // 调用外部的 callback，传递 step（外部负责 append 和保存）
        if (onStepFinishCallback) {
          await onStepFinishCallback(step);
        }
      },
      onError: async ({ error }) => {
        if (error instanceof TypeValidationError) {
          // see https://github.com/vercel/ai/pull/10523
          // ignore this error and continue streamText
          logger.debug(`xAI TypeValidationError ignored: ${(error as Error).message}`);
          return;
        }
        logger.error(`grokExpert streamText onError: ${(error as Error).message}`);
        reject(error);
      },
      onFinish: async ({ text, steps, usage, sources }) => {
        logger.info("grokExpert streamText onFinish");
        // Use the last step's text instead of accumulated text to avoid duplication
        // The accumulated text may include duplicate content from multiple steps
        const finalText = steps.length > 0 ? steps[steps.length - 1].text : text;
        const deduplicated = deduplicateText(finalText, {
          logger,
          minLength: 100,
          similarityThreshold: 0.95,
        });
        resolve({ text: deduplicated, usage, sources });
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
