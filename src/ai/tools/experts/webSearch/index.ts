import "server-only";

import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { webSearchPerplexity } from "./perplexity";
import { webSearchTavily } from "./tavily";
import { webSearchInputSchema, webSearchOutputSchema } from "./types";

export { tavilyClient } from "./tavily";

export const webSearchTool = ({
  provider = "tavily",
  statReport,
}: {
  studyUserChatId?: number;
  provider?: "tavily" | "perplexity";
} & Omit<AgentToolConfigArgs, "logger" | "locale" | "abortSignal">) =>
  tool({
    description:
      provider === "perplexity"
        ? "Search the internet for current information, which provides real-time web search with detailed citations and up-to-date information."
        : "Search the internet for current information, facts, or data that might be relevant to the study topic",
    inputSchema: webSearchInputSchema,
    outputSchema: webSearchOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ query }) => {
      // Execute search based on provider
      if (provider === "perplexity") {
        return await webSearchPerplexity({ query, statReport });
      } else {
        return await webSearchTavily({ query, statReport });
      }
    },
  });
