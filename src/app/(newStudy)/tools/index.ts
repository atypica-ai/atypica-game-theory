import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { PlainTextToolResult } from "@/ai/tools/types";
import { GoogleGenerativeAIProviderOptions, google } from "@ai-sdk/google";
import { generateText, stepCountIs, tool } from "ai";
import z from "zod";
import { endInterviewInputSchema, endInterviewOutputSchema } from "./types";

export const newStudyTools = {
  endInterview: tool({
    description: "End the planning session and generate the user's study brief",
    inputSchema: endInterviewInputSchema,
    outputSchema: endInterviewOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execute: async ({ studyBrief }) => {
      // 故意等1s，这样前端可以感觉到工具正在被执行。
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return {
        plainText: "Study brief generated successfully.",
      };
    },
  }),
  webFetch: tool({
    description:
      "Search the web or fetch content from URLs mentioned in the user's message. Use this when you need current information, market data, or content from specific websites.",
    inputSchema: z.object({}),
    outputSchema: z.object({
      plainText: z.string(),
    }),
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({}, { messages }) => {
      const { text } = await generateText({
        model: llm("gemini-2.5-flash"),
        providerOptions: {
          ...defaultProviderOptions,
          google: {
            // thinkingConfig: { includeThoughts: true, thinkingLevel: "low" },  // 2.5 flash 不支持
          } satisfies GoogleGenerativeAIProviderOptions,
        },
        tools: {
          google_search: google.tools.googleSearch({ mode: "MODE_DYNAMIC" }), // tool 名字 google_search 是指定的，不能随便写
          url_context: google.tools.urlContext({}), // tool 名字 url_context 是指定的，不能随便写
        },
        stopWhen: stepCountIs(2),
        system:
          "Analyze the user's latest message. If it contains URLs, fetch their content using url_context. If it requires web search, use google_search. Provide concise, relevant information in the same language as the user's message.",
        messages: messages
          .filter((message) => message.role === "user" || message.role === "assistant")
          .map(({ content, ...message }) => ({
            ...message,
            content:
              typeof content === "string"
                ? content
                : Array.isArray(content)
                  ? content.map((part) => (part.type === "text" ? part.text : "")).join("\n")
                  : "",
          }))
          .filter((message) => message.content.length > 0),
      });
      return {
        plainText: text,
      };
    },
  }),
};
