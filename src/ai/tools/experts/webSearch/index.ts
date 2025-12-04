import "server-only";

import { AgentToolConfigArgs, PlainTextToolResult, ToolName } from "@/ai/tools/types";
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
    execute: async ({ query }, { messages }) => {
      const toolUseCount = messages
        .filter((message) => message.role === "tool")
        .reduce(
          (_count, message) => {
            const count = { ..._count };
            (message.content ?? []).forEach((part) => {
              const toolName = part.toolName as ToolName;
              count[toolName] = (count[toolName] || 0) + 1;
            });
            return count;
          },
          {} as Partial<Record<ToolName, number>>,
        );

      // Before planStudy is called, webSearch can only be used once
      if (
        (toolUseCount[ToolName.planStudy] ?? 0) < 1 &&
        (toolUseCount[ToolName.webSearch] ?? 0) >= 1
      ) {
        return {
          results: [],
          plainText:
            "The webSearch tool can only be used once before the planStudy tool is called. Please save your analyst topic and use planStudy to plan the searches first, then you can continue web searching.",
        };
      }
      if ((toolUseCount[ToolName.webSearch] ?? 0) >= 3) {
        return {
          results: [],
          plainText:
            "The webSearch tool has reached its limit of 3 uses per study session. Please continue with your study using the information already gathered.",
        };
      }

      // Execute search based on provider
      if (provider === "perplexity") {
        return await webSearchPerplexity({ query, statReport });
      } else {
        return await webSearchTavily({ query, statReport });
      }
    },
  });
