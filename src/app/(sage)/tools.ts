import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { tool } from "ai";
import { getLocale } from "next-intl/server";
import { z } from "zod";

/**
 * Tool for ending a supplementary interview
 */
const endInterviewTool = ({ interviewId }: { interviewId: number }) =>
  tool({
    description:
      "End the supplementary interview when all questions have been answered sufficiently.",
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
        // Get interview with sage info
        const interview = await prisma.sageInterview.findUnique({
          where: { id: interviewId },
          select: { sageId: true },
        });

        if (!interview) {
          throw new Error(`Interview ${interviewId} not found`);
        }

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

        logger.info({
          msg: "Supplementary interview ended",
          summary,
          keyInsightsCount: keyInsights.length,
          satisfactionLevel,
        });

        // Trigger Memory Document update and gap resolution in background
        waitUntil(
          (async () => {
            try {
              const locale = await getLocale();
              const { updateMemoryDocumentFromInterview } = await import("./processing");

              await updateMemoryDocumentFromInterview({
                sageId: interview.sageId,
                interviewId,
                locale,
              });

              logger.info({
                msg: "Updated Memory Document and resolved gaps from interview",
                sageId: interview.sageId,
              });
            } catch (error) {
              logger.error({
                msg: "Failed to update Memory Document from interview",
                error: (error as Error).message,
              });
            }
          })(),
        );

        return {
          success: true,
          message: "Interview completed successfully. Thank you for your time!",
        };
      } catch (error) {
        logger.error({
          msg: "Failed to end interview",
          error: (error as Error).message,
        });
        throw error;
      }
    },
  });

export enum SageInterviewToolName {
  endInterview = "endInterview",
}

export function sageInterviewTools({ interviewId }: { interviewId: number }) {
  return {
    [SageInterviewToolName.endInterview]: endInterviewTool({ interviewId }),
  };
}
