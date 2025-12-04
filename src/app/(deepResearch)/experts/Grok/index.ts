import { defaultProviderOptions, llm } from "@/ai/provider";
import { xai } from "@ai-sdk/xai";
import { stepCountIs, streamText } from "ai";
import grokSystemPrompt from "./prompt";
const MAX_STEPS = 8;

export const grokExpert = async ({
  query,
  abortSignal,
  userId,
}: {
  query: string;
  abortSignal?: AbortSignal;
  userId?: number;
}) => {
  // Build tools object with error handling
  const allTools: Record<string, any> = {
    x_search: xai.tools.xSearch({
      enableImageUnderstanding: true,
      enableVideoUnderstanding: true,
    }),
    web_search: xai.tools.webSearch({
      enableImageUnderstanding: true,
    }),
  };

  const response = streamText({
    model: llm("grok-4"),
    system: grokSystemPrompt,
    providerOptions: defaultProviderOptions,
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
  });
  return response;
};
