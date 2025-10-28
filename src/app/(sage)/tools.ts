import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/prisma/prisma";
import { rootLogger } from "@/lib/logging";

/**
 * Tool for ending a supplementary interview
 */
export function createEndInterviewTool({ interviewId }: { interviewId: number }) {
  return tool({
    description: "End the supplementary interview when all questions have been answered sufficiently.",
    inputSchema: z.object({
      summary: z.string().describe("A brief summary of key findings from this interview"),
      keyInsights: z
        .array(z.string())
        .describe("3-5 key insights or discoveries from the interview"),
      satisfactionLevel: z
        .enum(["excellent", "good", "fair"])
        .describe("How well the interview achieved its goals"),
    }),
    execute: async ({ summary, keyInsights, satisfactionLevel }) => {
      const logger = rootLogger.child({ interviewId });

      try {
        // Update interview status
        await prisma.sageInterview.update({
          where: { id: interviewId },
          data: {
            status: "completed",
            progress: 1,
            summary,
            extra: {
              findings: {
                keyDiscoveries: keyInsights,
                satisfactionLevel,
              },
              completedAt: new Date().toISOString(),
            },
          },
        });

        logger.info("Supplementary interview ended", {
          summary,
          keyInsightsCount: keyInsights.length,
          satisfactionLevel,
        });

        return {
          success: true,
          message: "Interview completed successfully. Thank you for your time!",
        };
      } catch (error) {
        logger.error("Failed to end interview", {
          error: (error as Error).message,
        });
        throw error;
      }
    },
  });
}

/**
 * Tool for updating interview progress
 */
export function createUpdateInterviewProgressTool({ interviewId }: { interviewId: number }) {
  return tool({
    description: "Update the interview progress indicator based on how many questions have been covered.",
    inputSchema: z.object({
      progress: z
        .number()
        .min(0)
        .max(1)
        .describe("Progress value from 0 to 1 (e.g., 0.5 for 50% complete)"),
      currentFocus: z.string().optional().describe("Current focus area being discussed"),
    }),
    execute: async ({ progress, currentFocus }) => {
      const logger = rootLogger.child({ interviewId });

      try {
        await prisma.sageInterview.update({
          where: { id: interviewId },
          data: {
            progress,
            extra: {
              currentFocus,
              lastProgressUpdate: new Date().toISOString(),
            },
          },
        });

        logger.info("Interview progress updated", {
          progress,
          currentFocus,
        });

        return {
          success: true,
          progress,
        };
      } catch (error) {
        logger.error("Failed to update interview progress", {
          error: (error as Error).message,
        });
        throw error;
      }
    },
  });
}

export enum SageInterviewToolName {
  endInterview = "endInterview",
  updateProgress = "updateInterviewProgress",
}

export function sageInterviewTools({ interviewId }: { interviewId: number }) {
  return {
    [SageInterviewToolName.endInterview]: createEndInterviewTool({ interviewId }),
    [SageInterviewToolName.updateProgress]: createUpdateInterviewProgressTool({ interviewId }),
  };
}
