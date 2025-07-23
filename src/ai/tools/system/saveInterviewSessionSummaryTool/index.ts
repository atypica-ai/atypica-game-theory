import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { InterviewSessionStatus } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { z } from "zod";

// Tool to save interview summary and key insights
export const saveInterviewSessionSummaryTool = ({ sessionId }: { sessionId: number }) =>
  tool({
    description: "Save a summary of the interview with key insights and findings",
    parameters: z.object({
      summary: z.string().describe("A comprehensive summary of the interview findings"),
      keyInsights: z
        .array(z.string())
        .describe("A list of key insights extracted from the interview"),
      analysis: z
        .string()
        .describe(
          "Detailed analysis of the interview in markdown format, including patterns, notable quotes, and implications",
        ),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ summary, keyInsights, analysis }) => {
      try {
        // Update the interview session with the summary and insights
        await prisma.interviewSessionLegacy.update({
          where: { id: sessionId },
          data: {
            summary,
            keyInsights,
            analysis,
            status: InterviewSessionStatus.completed,
            completedAt: new Date(),
          },
        });
        return {
          plainText: "Interview summary saved successfully.",
        };
      } catch (error) {
        console.error("Error saving interview summary:", error);
        return {
          plainText: "Failed to save interview summary",
        };
      }
    },
  });
