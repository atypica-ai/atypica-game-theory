import "server-only";

import { llm } from "@/ai/provider";
import { StatReporter } from "@/ai/tools/types";
import { generateText } from "ai";
import { WebSearchToolResult } from "./types";

export async function webSearchPerplexity({
  query,
  statReport,
}: {
  query: string;
  statReport: StatReporter;
}): Promise<WebSearchToolResult> {
  try {
    const { text, sources, usage } = await generateText({
      model: llm("sonar-pro"),
      prompt: query,
      providerOptions: {
        perplexity: {
          return_images: false,
        },
      },
      maxOutputTokens: 2000,
    });

    // Convert sources to results format
    const results =
      sources && sources.length > 0
        ? sources.map((source) => ({
            url: "url" in source ? source.url : source.id,
            title: "url" in source ? source.url : source.id,
            content: "",
          }))
        : [];

    // Create answer with sources
    const answer =
      text +
      (sources && sources.length > 0
        ? `\n\nSources:\n${sources
            .map((source, index) => {
              const url = "url" in source ? source.url : source.id;
              return `[${index + 1}] ${url}`;
            })
            .join("\n")}`
        : "");

    // Token usage calculation
    const totalTokens =
      (usage.outputTokens ?? 0) * 3 + (usage.inputTokens ?? 0) || (usage.totalTokens ?? 0);
    await statReport("tokens", totalTokens, {
      reportedBy: "webSearch tool",
      provider: "perplexity",
    });

    return {
      answer,
      results,
      plainText: answer,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Perplexity web search failed: ${errorMessage}`);
  }
}
