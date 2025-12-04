import "server-only";

import { AgentToolConfigArgs, PlainTextToolResult, ToolName } from "@/ai/tools/types";
import { llm } from "@/ai/provider";
import { tool } from "ai";
import { generateText } from "ai";
import {
  webSearchPerplexitySonarProInputSchema,
  webSearchPerplexitySonarProOutputSchema,
  type WebSearchPerplexitySonarProToolResult,
} from "./types";
import { StatReporter } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";

// export const appendAnalystStudySummary = async ({
//   studyUserChatId,
//   content,
// }: {
//   studyUserChatId: number;
//   content: string;
// }) => {
//   const { analyst } = await prisma.userChat.findUniqueOrThrow({
//       where: { id: studyUserChatId, kind: "study" },
//       select: {
//         analyst: {
//           select: {
//             id: true,
//             kind: true,
//             studySummary: true,
//           },
//         },
//       },
//     });
//     if (!analyst) {
//       throw new Error("Something went wrong, analyst does not exist on studyUserChat");
//     }
//     const analystId = analyst.id;
//     await prisma.analyst.update({
//       where: { id: analystId },
//       data: {
//         studySummary:
//           analyst.studySummary +
//           content,
//       },
//     });
//     console.log("appendAnalystStudySummary success");
// };

async function webSearchPerplexitySonarPro({ query, statReport }: { query: string, statReport: StatReporter }): Promise<WebSearchPerplexitySonarProToolResult> {
  try {
    
    const { text, sources, usage } = await generateText({
      model: llm("sonar-pro"),
      prompt: query,
      providerOptions: {
        perplexity: {
          return_images: false, // Disable images for now
        },
      },
      maxOutputTokens: 2000, // This controls the level of detail of the answer
    });
    // Create a plain text response that includes the answer and sources
    const answer = text + (sources && sources.length > 0 
      ? `\n\nSources:\n${sources.map((source, index) => {
          const url = 'url' in source ? source.url : source.id;
          return `[${index + 1}] ${url}`;
        }).join('\n')}`
      : '');

    // this formula still requires attention..
    const totalTokens =
      (usage.outputTokens ?? 0) * 3 + (usage.inputTokens ?? 0) || (usage.totalTokens ?? 0);
    await statReport("tokens", totalTokens, {
      reportedBy: "webSearchPerplexitySonarPro tool",
    });
    return {
      answer: answer,
      plainText: answer,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Perplexity web search failed: ${errorMessage}`);
  }
}

export const webSearchPerplexitySonarProTool = ({
  statReport,
  ...toolCallConfigArgs
}: Omit<AgentToolConfigArgs, "logger" | "abortSignal">) =>
  tool({
    description:
      "Search the internet for current information, which provides real-time web search with detailed citations and up-to-date information.",
    inputSchema: webSearchPerplexitySonarProInputSchema,
    outputSchema: webSearchPerplexitySonarProOutputSchema,
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
      
      // // Before saveAnalyst is called, webSearchPerplexitySonarPro can only be used once
      if (
        (toolUseCount[ToolName.saveAnalyst] ?? 0) < 1 &&
        (toolUseCount[ToolName.webSearchPerplexitySonarPro] ?? 0) >= 1
      ) {
        return {
          answer: "",
          plainText:
            "The webSearchPerplexitySonarPro tool can only be used once before the saveAnalyst tool is called. Please save your analyst topic first, then you can continue web searching.",
        };
      }
      if ((toolUseCount[ToolName.webSearchPerplexitySonarPro] ?? 0) >= 3) {
        return {
          answer: "",
          plainText:
            "The webSearchPerplexitySonarPro tool has reached its limit of 3 uses per study session. Please continue with your study using the information already gathered.",
        };
      }

      const result = await webSearchPerplexitySonarPro({ query, statReport });
      console.log("webSearchPerplexitySonarPro result", result);
      return result;
    },
  });
