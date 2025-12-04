import "server-only";

import { StatReporter } from "@/ai/tools/types";
import { tavily, TavilyClient } from "@tavily/core";
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

export async function webSearchTavily({
  query,
  statReport,
}: {
  query: string;
  statReport: StatReporter;
}): Promise<WebSearchToolResult> {
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

    // Tavily: fixed 3000 tokens per query
    await statReport("tokens", 3000, {
      reportedBy: "webSearch tool",
      provider: "tavily",
    });

    return {
      answer: response.answer,
      results: response.results,
      plainText: answer,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Tavily web search failed: ${errorMessage}`);
  }
}
