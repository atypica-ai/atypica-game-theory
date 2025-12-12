import "server-only";

import { planPodcastPrologue, planPodcastSystem } from "@/ai/prompt/study/planPodcast";
import { defaultProviderOptions, llm } from "@/ai/provider";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { google } from "@ai-sdk/google";
import { streamText, tool, UserModelMessage } from "ai";
import { planPodcastInputSchema, planPodcastOutputSchema, type PlanPodcastResult } from "./types";

async function planPodcast({
  locale,
  background,
  question,
  abortSignal,
  statReport,
  logger,
}: {
  background: string;
  question: string;
} & AgentToolConfigArgs): Promise<PlanPodcastResult> {
  return new Promise(async (resolve, reject) => {
    const response = streamText({
      model: llm("gemini-2.5-pro"),
      providerOptions: defaultProviderOptions,
      tools: {
        google_search: google.tools.googleSearch({
          mode: "MODE_DYNAMIC",
          dynamicThreshold: 0, // threshold 越小，使用搜索的可能性就越高，0就是一定会搜索
        }),
      },
      system: planPodcastSystem({ locale }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: planPodcastPrologue({ locale, background, question }),
            },
          ],
        },
      ] as UserModelMessage[],
      onFinish: async (result) => {
        logger.info(`planPodcast streamText onFinish`);
        const reasoningText = result.reasoningText ?? "";
        const text = result.text ?? "";
        if (statReport) {
          const { tokens, extra } = calculateStepTokensUsage(result);
          await statReport("tokens", tokens, {
            reportedBy: "planPodcast tool",
            ...extra,
          });
        }
        resolve({
          reasoning: reasoningText,
          text,
          plainText: text,
        });
      },
      onError: ({ error }) => {
        logger.error(`planPodcast streamText onError: ${(error as Error).message}`);
        reject(error);
      },
      abortSignal,
    });
    await response
      .consumeStream()
      .then(() => {})
      .catch((error) => reject(error));
  });
}

export const planPodcastTool = ({
  // studyUserChatId,
  ...toolCallConfigArgs
}: {
  studyUserChatId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Plan a podcast content strategy based on the user's question. This tool analyzes the most attractive angle for audiences and plans research strategy including core questions, research directions, and information depth requirements. The analyst kind is fixed to 'fastInsight' for podcast generation.",
    inputSchema: planPodcastInputSchema,
    outputSchema: planPodcastOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ background, question }) => {
      // Plan the podcast strategy
      const planResult = await planPodcast({
        background,
        question,
        ...toolCallConfigArgs,
      });

      // Return planning result; analyst updates will be handled by lead agent in onStepFinish
      return {
        reasoning: planResult.reasoning,
        text: planResult.text,
        plainText: `Podcast planning completed successfully. ${planResult.plainText}`,
      };
    },
  });
