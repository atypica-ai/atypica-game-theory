import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { planStudyPrologue, planStudySystem } from "@/app/(study)/prompt/planStudy";
import { google } from "@ai-sdk/google";
import { streamText, tool, UserModelMessage } from "ai";
import { planStudyInputSchema, planStudyOutputSchema, type PlanStudyResult } from "./types";

async function planStudy({
  locale,
  background,
  question,
  abortSignal,
  statReport,
  logger,
  teamStudySystemPrompt,
}: {
  background: string;
  question: string;
  teamStudySystemPrompt?: Record<string, string> | null;
} & AgentToolConfigArgs): Promise<PlanStudyResult> {
  return new Promise(async (resolve, reject) => {
    const response = streamText({
      model: llm("gemini-2.5-pro"),
      providerOptions: defaultProviderOptions(),
      tools: {
        google_search: google.tools.googleSearch({
          mode: "MODE_DYNAMIC",
          dynamicThreshold: 0, // threshold 越小，使用搜索的可能性就越高，0就是一定会搜索
        }),
      },
      system: planStudySystem({ locale, teamStudySystemPrompt }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: planStudyPrologue({ locale, background, question }),
            },
          ],
        },
      ] as UserModelMessage[],
      // maxTokens: 500,
      // onChunk: (chunk) => console.log("[Reasoning]", JSON.stringify(chunk)),
      onFinish: async (result) => {
        logger.info(`planStudy streamText onFinish`);
        const reasoningText = result.reasoningText ?? "";
        const text = result.text ?? "";
        if (statReport) {
          const { tokens, extra } = calculateStepTokensUsage(result);
          await statReport("tokens", tokens, {
            reportedBy: "planStudy tool",
            ...extra,
          });
        }
        resolve({
          reasoning: reasoningText,
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
  // userChatId,
  teamStudySystemPrompt,
  ...toolCallConfigArgs
}: {
  userChatId: number;
  teamStudySystemPrompt?: Record<string, string> | null;
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
        teamStudySystemPrompt,
        ...toolCallConfigArgs,
      });
      return result;
    },
  });
