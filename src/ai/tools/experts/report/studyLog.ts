import "server-only";

import { studyLogPrologue, studyLogSystem } from "@/ai/prompt";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { Analyst } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export async function generateAndSaveStudyLog({
  analyst,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  analyst: Analyst & {
    interviews: {
      conclusion: string;
    }[];
  };
} & AgentToolConfigArgs): Promise<{ studyLog: string }> {
  const systemPrompt = studyLogSystem({ locale });
  // logger.info("Study Process System Prompt:\n" + systemPrompt);
  const prologue = studyLogPrologue({ locale, analyst });
  // logger.info("Study Process Prologue:\n" + prologue);
  const promise = new Promise<{ studyLog: string }>(async (resolve, reject) => {
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
              text: prologue,
            },
          ],
        },
      ],
      // maxTokens: 500,
      // onChunk: (chunk) => console.log("[Reasoning]", JSON.stringify(chunk)),
      onFinish: async ({ finishReason, text, usage }) => {
        // const reasoning = result.reasoning ?? "";
        // const text = result.text ?? "";
        // resolve({ reasoning, text, plainText: text });
        const studyLog = text ?? "";
        logger.info({ msg: "studyLog streamText onFinish", finishReason, usage });
        if (usage.totalTokens && usage.totalTokens > 0 && statReport) {
          await statReport("tokens", usage.totalTokens, {
            reportedBy: "studyLog tool",
            usage,
          });
        }
        await prisma.analyst.update({
          where: { id: analyst.id },
          data: { studyLog: studyLog },
        });
        resolve({ studyLog });
      },
      onError: ({ error }) => {
        logger.error(`studyLog streamText onError: ${(error as Error).message}`);
        reject(error);
      },
      abortSignal,
    });
    await response.consumeStream();
  });

  return await promise;
}
