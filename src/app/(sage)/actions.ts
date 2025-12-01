"use server";

import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { endSageInterview } from "./processing/gaps";
import type { SageInterviewExtra } from "./types";

// ===== Sage Interview =====

/**
 * End sage interview - triggered by manual user action
 * Performs gap resolution and adds working memory (if gaps resolved)
 */
export async function endSageInterviewAction(interviewId: number): Promise<
  ServerActionResult<{
    resolvedGapsCount: number;
    workingMemoryAdded: boolean;
  }>
> {
  return withAuth(async (user) => {
    try {
      // Get interview and verify ownership
      const interview = await prisma.sageInterview.findUnique({
        where: { id: interviewId },
        include: {
          sage: {
            select: {
              id: true,
              userId: true,
              locale: true,
            },
          },
        },
      });

      if (!interview) {
        return {
          success: false,
          message: "Interview not found",
          code: "not_found",
        };
      }

      // Check ownership
      if (interview.sage.userId !== user.id) {
        return {
          success: false,
          message: "Unauthorized",
          code: "forbidden",
        };
      }

      // Check if interview is already completed
      const extra = interview.extra as SageInterviewExtra;
      if (!extra.ongoing) {
        return {
          success: false,
          message: "Interview has already been completed",
          code: "internal_server_error",
        };
      }

      // End the interview
      const result = await endSageInterview({
        sageId: interview.sageId,
        interviewId,
        locale: interview.sage.locale as "zh-CN" | "en-US",
      });

      // Mark interview as completed
      await mergeExtra({
        tableName: "SageInterview",
        id: interviewId,
        extra: {
          ongoing: false,
        } satisfies SageInterviewExtra,
      });

      rootLogger.info({
        msg: "Sage interview ended successfully",
        interviewId,
        sageId: interview.sageId,
        userId: user.id,
        resolvedGapsCount: result.resolvedGapsCount,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      rootLogger.error({
        msg: "Failed to end sage interview",
        error: (error as Error).message,
        interviewId,
      });
      return {
        success: false,
        message: "Failed to end interview",
        code: "internal_server_error",
      };
    }
  });
}
