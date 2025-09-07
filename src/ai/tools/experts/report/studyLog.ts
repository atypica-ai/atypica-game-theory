import "server-only";

import { studyLogPrologue, studyLogSystem } from "@/ai/prompt/studyLog";
import { llm, providerOptions } from "@/ai/provider";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { Analyst } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
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
          content: prologue,
        },
      ],
      // maxTokens: 500,
      // onChunk: (chunk) => console.log("[Reasoning]", JSON.stringify(chunk)),
      onFinish: async (result) => {
        // const reasoning = result.reasoning ?? "";
        // const text = result.text ?? "";
        // resolve({ reasoning, text, plainText: text });
        const studyLog = result.text ?? "";
        await prisma.analyst.update({
          where: { id: analyst.id },
          data: { studyLog: studyLog },
        });
        resolve({ studyLog });
        if (result.usage.totalTokens > 0 && statReport) {
          await statReport("tokens", result.usage.totalTokens, {
            reportedBy: "studyLog tool",
          });
        }
      },
      onError: ({ error }) => {
        logger.error(`Error generating study log: ${(error as Error).message}`);
        reject(error);
      },
      abortSignal,
    });
    await response.consumeStream();
  });

  return await promise;
}
