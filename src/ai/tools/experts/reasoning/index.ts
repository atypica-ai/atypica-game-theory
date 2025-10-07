import "server-only";

import { reasoningPrologue, reasoningSystem } from "@/ai/prompt";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { google } from "@ai-sdk/google";
import { streamText, tool, UserModelMessage } from "ai";
import { reasoningThinkingInputSchema, reasoningThinkingOutputSchema } from "./types";

export const reasoningThinkingTool = ({
  locale,
  abortSignal,
  statReport,
  logger,
}: AgentToolConfigArgs) =>
  tool({
    description:
      "Get expert consultation and step-by-step reasoning analysis for complex problems or decisions. Provides detailed thinking process and professional insights on specific research questions or challenges.",
    inputSchema: reasoningThinkingInputSchema,
    outputSchema: reasoningThinkingOutputSchema,
    // 这里设置 PlainTextToolResult 类型，强制 reasoningThinkingOutputSchema 里定义 plainText 字段
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execute: async ({ background, question }, { messages }) => {
      const streamTextPromise = new Promise<{ reasoningText?: string; text: string }>(
        async (resolve, reject) => {
          const response = streamText({
            // model: llm("o3-mini"),
            model: llm("gemini-2.5-pro"),
            providerOptions: defaultProviderOptions,
            tools: {
              google_search: google.tools.googleSearch({
                mode: "MODE_DYNAMIC",
                dynamicThreshold: 0.1, // threshold 越小，使用搜索的可能性就越高，0就是一定会搜索
              }),
            },
            system: reasoningSystem({ locale }),
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: reasoningPrologue({ locale, background, question }),
                  },
                ],
              },
            ] as UserModelMessage[],
            // maxTokens: 500,
            // onChunk: (chunk) => logger.info(`[Reasoning] ${JSON.stringify(chunk)}`),
            onFinish: async ({ reasoningText, text, usage }) => {
              logger.info({ msg: "reasoningThinking streamText onFinish", usage });
              if (usage.totalTokens && usage.totalTokens > 0 && statReport) {
                await statReport("tokens", usage.totalTokens, {
                  reportedBy: "reasoningThinking tool",
                });
              }
              resolve({ reasoningText, text });
            },
            onError: ({ error }) => {
              if ((error as Error).name === "AbortError") {
                logger.warn(`reasoningThinking streamText aborted: ${(error as Error).message}`);
              } else {
                logger.error(`reasoningThinking streamText onError: ${(error as Error).message}`);
                reject(error);
              }
            },
            abortSignal,
          });
          abortSignal.addEventListener("abort", () => {
            reject(new Error("reasoningThinking abortSignal received"));
          });
          response
            .consumeStream()
            .then(() => {})
            .catch((error) => reject(error));
        },
      );

      const { reasoningText, text } = await streamTextPromise;
      return {
        reasoning: reasoningText ?? "",
        text: text ?? "",
        plainText: text,
      };
    },
  });
