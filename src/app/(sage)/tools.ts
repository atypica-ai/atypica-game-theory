import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { waitUntil } from "@vercel/functions";
import { tool } from "ai";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { updateMemoryDocumentFromInterview } from "./processing/memory";
import { SageInterviewExtra } from "./types";

/**
 * Tool for ending a supplementary interview
 */
const endInterviewTool = ({ interviewId }: { interviewId: number }) =>
  tool({
    description:
      "End the supplementary interview when all questions have been answered sufficiently.",
    inputSchema: z.object({
      summary: z.string().describe("A brief summary of key findings from this interview"),
    }),
    execute: async ({ summary }) => {
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

        await mergeExtra({
          tableName: "SageInterview",
          id: interviewId,
          extra: {
            ongoing: false,
            summary,
            completedAt: Date.now(),
          } satisfies SageInterviewExtra,
        });

        logger.info({ msg: "Supplementary interview ended" });

        // Trigger Memory Document update and gap resolution in background
        waitUntil(
          (async () => {
            try {
              const locale = await getLocale();

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
