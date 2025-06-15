import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tavily, TavilyClient } from "@tavily/core";
import { tool } from "ai";
import { z } from "zod";
import { WebSearchToolResult } from "./types";

const globalForStripe = global as unknown as {
  tavily: TavilyClient | undefined;
};

export const tavilyClient = () => {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error("Tavily API key not found");
  }
  const proxyUrl = process.env.FETCH_HTTPS_PROXY;
  const proxies = proxyUrl ? { http: proxyUrl, https: proxyUrl } : undefined;
  if (!globalForStripe.tavily) {
    globalForStripe.tavily = tavily({
      apiKey: process.env.TAVILY_API_KEY,
      proxies,
    });
  }
  return globalForStripe.tavily;
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

export const webSearchTool = tool({
  description:
    "Search the internet for current information, facts, or data that might be relevant to the research topic",
  parameters: z.object({
    query: z.string().describe("The search query to find relevant information on the internet"),
  }),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ query }) => {
    const result = await webSearch({ query });
    return result;
  },
});
