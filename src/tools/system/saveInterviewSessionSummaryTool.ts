import { prisma } from "@/lib/prisma";
import { InterviewSessionStatus } from "@prisma/client";
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
    execute: async ({ summary, keyInsights, analysis }) => {
      try {
        // Update the interview session with the summary and insights
        await prisma.interviewSession.update({
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
          success: true,
          message: "Interview summary saved successfully.",
        };
      } catch (error) {
        console.error("Error saving interview summary:", error);
        return {
          success: false,
          message: `Failed to save interview summary: ${(error as Error).message}`,
        };
      }
    },
  });
