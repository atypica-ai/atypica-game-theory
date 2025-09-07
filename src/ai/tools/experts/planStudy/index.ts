import "server-only";

import { planStudyPrologue, planStudySystem } from "@/ai/prompt";
import { llm, providerOptions } from "@/ai/provider";
import { PlainTextToolResult, ReasoningThinkingResult, StatReporter } from "@/ai/tools/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { streamText, tool } from "ai";
import { Locale } from "next-intl";
import { z } from "zod";

async function planStudy({
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
      const systemPrompt = planStudySystem({ locale });
      const response = streamText({
        model: llm("gemini-2.5-pro", {
          useSearchGrounding: true,
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0, // threshold 越小，使用搜索的可能性就越高，0就是一定会搜索
          },
        }),
        providerOptions: providerOptions,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: planStudyPrologue({
              locale,
              background: background,
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
              reportedBy: "audienceCall tool",
            });
          }
        },
        onError: (error) => {
          console.log("Error generating audience call reasoning:", error);
          reject(error);
        },
        abortSignal,
      });
      await response.consumeStream();
    });
  } catch (error) {
    console.log("Error generating audience call reasoning:", error);
    throw error;
  }
}

export const planStudyTool = ({
  studyUserChatId,
  locale,
  abortSignal,
  statReport,
}: {
  studyUserChatId: number;
  locale: Locale;
  abortSignal?: AbortSignal;
  statReport?: StatReporter;
}) =>
  tool({
    description:
      "Ask the professional consultant to plan a research plan based on the user's question.",
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
    execute: async ({ background, question }) => {
      const result = await planStudy({
        locale,
        background,
        question,
        abortSignal,
        statReport,
      });
      const { analyst } = await prisma.userChat.findUniqueOrThrow({
        where: { id: studyUserChatId, kind: "study" },
        select: {
          analyst: {
            select: {
              id: true,
              topic: true,
              kind: true,
            },
          },
        },
      });
      if (!analyst) {
        throw new Error("Something went wrong, analyst does not exist on studyUserChat");
      }
      const analystId = analyst.id;
      await prisma.analyst.update({
        where: { id: analystId },
        data: {
          topic:
            analyst.topic +
            (locale === "zh-CN" ? "\n\n研究计划：\n" : "\n\nStudy Plan: \n") +
            result.text,
        },
      });
      return result;
    },
  });
