import "server-only";

import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { tavily, TavilyClient } from "@tavily/core";
import { tool } from "ai";
import { z } from "zod";
import { WebSearchToolResult } from "./types";

const globalForTavily = global as unknown as {
  tavily: TavilyClient | undefined;
};

export const tavilyClient = () => {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error("Tavily API key not found");
  }
  const proxyUrl = process.env.FETCH_HTTPS_PROXY;
  const proxies = proxyUrl ? { http: proxyUrl, https: proxyUrl } : undefined;
  if (!globalForTavily.tavily) {
    globalForTavily.tavily = tavily({
      apiKey: process.env.TAVILY_API_KEY,
      proxies,
    });
  }
  return globalForTavily.tavily;
};

async function webSearch({ query }: { query: string }): Promise<WebSearchToolResult> {
  try {
    const client = tavilyClient();
    const response = await client.search(query, {
      searchDepth: "advanced",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      includeAnswer: "advanced" as any,
      includeImages: false,
      includeRawContent: false,
      maxResults: 10,
    });
    const answer = response.answer || "No answer found for this query.";
    return {
      answer: response.answer,
      results: response.results,
      plainText: answer,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Web search failed: ${errorMessage}`);
  }
}

export const webSearchTool = ({
  // studyUserChatId,
  statReport,
}: {
  studyUserChatId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Search the internet for current information, facts, or data that might be relevant to the study topic",
    parameters: z.object({
      query: z.string().describe("The search query to find relevant information on the internet"),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ query }) => {
      // const toolUseCount = messages
      //   .filter((message) => message.role === "tool")
      //   .reduce(
      //     (_count, message) => {
      //       const count = { ..._count };
      //       (message.content ?? []).forEach((part) => {
      //         const toolName = part.toolName as ToolName;
      //         count[toolName] = (count[toolName] || 0) + 1;
      //       });
      //       return count;
      //     },
      //     {} as Partial<Record<ToolName, number>>,
      //   );
      // if ((toolUseCount[ToolName.webSearch] ?? 0) >= 4) {
      //   return {
      //     results: [],
      //     plainText:
      //       "The webSearch tool has reached its limit of 2 uses per study session. Please continue with your study using the information already gathered.",
      //   };
      // }
      // if ((toolUseCount[ToolName.saveAnalyst] ?? 0) >= 1) {
      //   return {
      //     results: [],
      //     plainText:
      //       "The webSearch tool is not allowed after the saveAnalyst tool has been used. Please continue your research using the previously saved analyst topic.",
      //   };
      // }
      const result = await webSearch({ query });
      // 每次查询固定消耗 3000 tokens
      await statReport("tokens", 3000, {
        reportedBy: "webSearch tool",
      });
      return result;
    },
  });
