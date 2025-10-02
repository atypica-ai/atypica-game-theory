import "server-only";

import { reasoningPrologue, reasoningSystem } from "@/ai/prompt";
import { llm, providerOptions } from "@/ai/provider";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { streamText, tool } from "ai";
import { z } from "zod/v3";
import { ReasoningThinkingResult } from "./types";

export const reasoningThinkingTool = ({
  locale,
  abortSignal,
  statReport,
  logger,
}: AgentToolConfigArgs) =>
  tool({
    description:
      "Get expert consultation and step-by-step reasoning analysis for complex problems or decisions. Provides detailed thinking process and professional insights on specific research questions or challenges.",
    inputSchema: z.object({
      background: z
        .string()
        .describe(
          "Current context, findings so far, and relevant background information to help the expert understand the situation",
        )
        .transform(fixMalformedUnicodeString),
      question: z
        .string()
        .describe(
          "Specific question, problem, or topic that requires expert analysis and reasoning",
        )
        .transform(fixMalformedUnicodeString),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execute: async ({ background, question }, { messages }) => {
      const streamTextPromise = new Promise<{ reasoning?: string; text: string }>(
        async (resolve, reject) => {
          const response = streamText({
            // model: llm("o3-mini"),
            model: llm("gemini-2.5-pro", {
              useSearchGrounding: true,
              dynamicRetrievalConfig: {
                mode: "MODE_DYNAMIC",
                dynamicThreshold: 0.1, // threshold 越小，使用搜索的可能性就越高，0就是一定会搜索
              },
            }),
            providerOptions: providerOptions,
            system: reasoningSystem({ locale }),
            messages: [
              {
                role: "user",

                parts: [
                  {
                    type: "text",

                    text: reasoningPrologue({
                      locale,
                      background,
                      question,
                    }),
                  },
                ],
              },
            ],
            // maxTokens: 500,
            // onChunk: (chunk) => logger.info(`[Reasoning] ${JSON.stringify(chunk)}`),
            onFinish: async ({ reasoningText, text, usage }) => {
              logger.info({ msg: "reasoningThinking streamText onFinish", usage });
              if (usage.totalTokens > 0 && statReport) {
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
        reasoningText: reasoning ?? "",
        text: text ?? "",
        plainText: text,
      } as ReasoningThinkingResult;
    },
  });
