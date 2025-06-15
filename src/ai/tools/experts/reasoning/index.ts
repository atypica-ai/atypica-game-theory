import "server-only";

import { reasoningPrologue, reasoningSystem } from "@/ai/prompt";
import { llm, providerOptions } from "@/ai/provider";
import { PlainTextToolResult, ReasoningThinkingResult, StatReporter } from "@/ai/tools/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { streamText, tool } from "ai";
import { Locale } from "next-intl";
import { z } from "zod";

async function reasoningThinking({
  locale,
  background,
  question,
  abortSignal,
  statReport,
}: {
  locale: Locale;
  background: string;
  question: string;
  abortSignal?: AbortSignal;
  statReport?: StatReporter;
}): Promise<ReasoningThinkingResult> {
  try {
    return new Promise(async (resolve, reject) => {
      const response = streamText({
        // model: llm("o3-mini"),
        model: llm("gemini-2.5-pro", {
          useSearchGrounding: true,
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0, // threshold 越小，使用搜索的可能性就越高，0就是一定会搜索
          },
        }),
        providerOptions: providerOptions,
        system: reasoningSystem({ locale }),
        messages: [
          {
            role: "user",
            content: reasoningPrologue({
              locale,
              background,
              question,
            }),
          },
        ],
        // maxTokens: 500,
        // onChunk: (chunk) => console.log("[Reasoning]", JSON.stringify(chunk)),
        onFinish: async (result) => {
          const reasoning = result.reasoning ?? "";
          const text = result.text ?? "";
          resolve({
            reasoning,
            text,
            plainText: text,
          });
          if (result.usage.totalTokens > 0 && statReport) {
            await statReport("tokens", result.usage.totalTokens, {
              reportedBy: "reasoningThinking tool",
            });
          }
        },
        onError: (error) => {
          console.log("Error generating reasoning thinking:", error);
          reject(error);
        },
        abortSignal,
      });
      await response.consumeStream();
    });
  } catch (error) {
    console.log("Error generating reasoning thinking:", error);
    throw error;
  }
}

export const reasoningThinkingTool = ({
  locale,
  abortSignal,
  statReport,
}: {
  locale: Locale;
  abortSignal?: AbortSignal;
  statReport?: StatReporter;
}) =>
  tool({
    description:
      "Get expert consultation and step-by-step reasoning analysis for complex problems or decisions. Provides detailed thinking process and professional insights on specific research questions or challenges.",
    parameters: z.object({
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
    execute: async (
      { background, question },
      {
        // 第二个参数有 messages 等数据
        // messages
      },
    ) => {
      const result = await reasoningThinking({
        locale,
        background,
        question,
        abortSignal,
        statReport,
      });
      return result;
    },
  });
