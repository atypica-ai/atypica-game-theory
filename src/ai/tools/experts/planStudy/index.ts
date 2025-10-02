import "server-only";

import { planStudyPrologue, planStudySystem } from "@/ai/prompt";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { planStudyInputSchema, planStudyOutputSchema, type PlanStudyResult } from "./types";

async function planStudy({
  locale,
  background,
  question,
  abortSignal,
  statReport,
  logger,
}: {
  background: string;
  question: string;
} & AgentToolConfigArgs): Promise<PlanStudyResult> {
  return new Promise(async (resolve, reject) => {
    const systemPrompt = planStudySystem({ locale });
    const response = streamText({
      model: llm("gemini-2.5-pro"),
      providerOptions: defaultProviderOptions,
      tools: {
        google_search: google.tools.googleSearch({
          mode: "MODE_DYNAMIC",
          dynamicThreshold: 0, // threshold 越小，使用搜索的可能性就越高，0就是一定会搜索
        }),
      },
      system: systemPrompt,
      messages: [
        {
          role: "user",

          parts: [
            {
              type: "text",

              text: planStudyPrologue({
                locale,
                background: background,
                question,
              }),
            },
          ],
        },
      ],
      // maxTokens: 500,
      // onChunk: (chunk) => console.log("[Reasoning]", JSON.stringify(chunk)),
      onFinish: async (result) => {
        logger.info(`planStudy streamText onFinish`);
        const reasoningText = result.reasoningText ?? "";
        const text = result.text ?? "";
        if (result.usage.totalTokens && result.usage.totalTokens > 0 && statReport) {
          await statReport("tokens", result.usage.totalTokens, {
            reportedBy: "planStudy tool",
          });
        }
        resolve({
          reasoning: reasoningText,
          text,
          plainText: text,
        });
      },
      onError: ({ error }) => {
        logger.error(`planStudy streamText onError: ${(error as Error).message}`);
        reject(error);
      },
      abortSignal,
    });
    await response.consumeStream();
  });
}

export const planStudyTool = ({
  studyUserChatId,
  ...toolCallConfigArgs
}: {
  studyUserChatId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Ask the professional consultant to plan a research plan based on the user's question.",
    inputSchema: planStudyInputSchema,
    outputSchema: planStudyOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ background, question }) => {
      const result = await planStudy({
        background,
        question,
        ...toolCallConfigArgs,
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
            (toolCallConfigArgs.locale === "zh-CN" ? "\n\n研究计划：\n" : "\n\nStudy Plan: \n") +
            result.text,
        },
      });
      return result;
    },
  });
