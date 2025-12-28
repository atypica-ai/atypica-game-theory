import { defaultProviderOptions, llm } from "@/ai/provider";
import { PlainTextToolResult } from "@/ai/tools/types";
import { GoogleGenerativeAIProviderOptions, google } from "@ai-sdk/google";
import { generateText, stepCountIs, tool } from "ai";
import { Locale } from "next-intl";
import { webFetchInputSchema, webFetchOutputSchema } from "./types";

export const webFetchTool = ({ locale }: { locale: Locale }) =>
  tool({
    description:
      "Search the web or fetch content from URLs. Use this when you need current information, market data, or content from specific websites.",
    inputSchema: webFetchInputSchema,
    outputSchema: webFetchOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ query }, { messages }) => {
      const processedMessages = messages
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
        .filter((message) => message.content.length > 0);
      // Add query as the final user message with context explanation
      processedMessages.push({
        role: "user",
        content:
          locale === "zh-CN"
            ? `以上是我和用户对话的内容，请以此为背景，帮我完成以下请求：${query}`
            : `Here is the conversation between me and the user, please use it as context to help me complete the following request: ${query}`,
      });

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
        stopWhen: stepCountIs(3),
        system:
          locale === "zh-CN"
            ? "基于用户查询，抓取相关信息。如果查询包含URL，请使用url_context抓取其内容。如果需要网络搜索，请使用google_search。以与查询相同的语言提供简洁、相关的信息。"
            : "Based on the user's query, fetch relevant information. If the query contains URLs, fetch their content using url_context. If it requires web search, use google_search. Provide concise, relevant information in the same language as the query.",
        prompt: query,
        // 上下文有点干扰，先不用了，回头再优化
        // messages: processedMessages,
      });
      return {
        plainText: text,
      };
    },
  });
