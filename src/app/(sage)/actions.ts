"use server";
import { StatReporter } from "@/ai/tools/types";
import { makeSageInterviewPlan } from "@/app/(sage)/processing/followup";
import { discoverKnowledgeGapsFromSageChats } from "@/app/(sage)/processing/gaps";
import { extractKnowledgeFromSources } from "@/app/(sage)/processing/memory";
import { processSageSources } from "@/app/(sage)/processing/sources";
import type { SageExtra, SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import type { SageInterview, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { waitUntil } from "@vercel/functions";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { endSageInterview } from "./processing/gaps";
import type { SageInterviewExtra } from "./types";

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

/**
 * Create a supplementary interview to fill knowledge gaps
 */
export async function createSageInterviewAction(sageId: number): Promise<
  ServerActionResult<{
    interview: SageInterview;
    userChat: UserChat;
  }>
> {
  return withAuth(async (user) => {
    const sage = await prisma.sage
      .findUniqueOrThrow({
        where: {
          id: sageId,
          userId: user.id,
        },
        select: {
          locale: true,
          name: true,
          domain: true,
          expertise: true,
        },
      })
      .then(({ expertise, ...sage }) => ({ ...sage, expertise: expertise as string[] }));

    const locale = VALID_LOCALES.includes(sage.locale as Locale)
      ? (sage.locale as Locale)
      : await getLocale();
    const logger = rootLogger.child({ sageId });
    const statReport: StatReporter = (async (dimension, value, extra) => {
      rootLogger.info({
        msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
        extra,
        note: "extractKnowledgeOnly is currently free - tokens not deducted",
      });
    }) as StatReporter;
    const abortSignal = new AbortController().signal;

    // Get pending knowledge gaps
    const pendingGaps = await prisma.sageKnowledgeGap
      .findMany({
        where: {
          sageId,
          resolvedAt: null,
        },
        select: {
          area: true,
          description: true,
          severity: true,
          impact: true,
        },
        orderBy: [{ severity: "desc" }, { id: "asc" }],
      })
      .then((gaps) =>
        gaps.map((gap) => ({
          area: gap.area,
          severity: gap.severity as SageKnowledgeGapSeverity,
          description: gap.description,
          impact: gap.impact,
        })),
      );

    if (pendingGaps.length === 0) {
      return {
        success: false,
        message: "No pending knowledge gaps",
      };
    }

    // Generate interview plan
    const interviewPlan = await makeSageInterviewPlan({
      sage,
      pendingGaps,
      locale,
      logger,
      statReport,
      abortSignal,
    });

    const { interview, userChat } = await prisma.$transaction(async (tx) => {
      const userChat = await createUserChat({
        userId: user.id,
        kind: "sageSession",
        title: truncateForTitle(interviewPlan.purpose, {
          maxDisplayWidth: 60,
          suffix: "...",
        }),
        tx,
      });
      const interview = await tx.sageInterview.create({
        data: {
          sageId,
          userChatId: userChat.id,
          extra: {
            startsAt: Date.now(),
            ongoing: true,
            interviewPlan,
          } as SageInterviewExtra,
        },
      });
      return { interview, userChat };
    });

    rootLogger.info(`Created supplementary interview ${interview.id} for sage ${sageId}`);

    return {
      success: true,
      data: { interview, userChat },
    };
  });
}

/**
 * re-Process all sources and extract knowledge
 * 因为 source 支持删除，所以就算所有 sources 都被 parse 了，这个过程还是可以重新运行
 */
export async function extractSageKnowledgeAction(
  sageId: number,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const sage = await prisma.sage
      .findUniqueOrThrow({
        where: {
          id: sageId,
          userId: user.id,
        },
        select: { id: true, token: true, locale: true, extra: true },
      })
      .then(({ extra, ...sage }) => ({ ...sage, extra: extra as SageExtra }));

    // 超过 30 分钟可以重新开始
    if (sage.extra.processing && Date.now() - sage.extra.processing.startsAt < 30 * 60 * 1000) {
      return {
        success: false,
        message: "Sage is processing",
      };
    }

    const locale = VALID_LOCALES.includes(sage.locale as Locale)
      ? (sage.locale as Locale)
      : await getLocale();
    const logger = rootLogger.child({ sageId });
    const statReport: StatReporter = (async (dimension, value, extra) => {
      rootLogger.info({
        msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
        extra,
        note: "extractKnowledgeOnly is currently free - tokens not deducted",
      });
    }) as StatReporter;
    const abortSignal = new AbortController().signal;

    waitUntil(
      (async () => {
        await mergeExtra({
          tableName: "Sage",
          id: sage.id,
          extra: { processing: { startsAt: Date.now() }, error: null } satisfies SageExtra,
        });
        try {
          // 1. process sources
          await processSageSources({ sageId, logger, statReport, abortSignal });
          // 2. extract knowledge
          await extractKnowledgeFromSources({ sageId, locale, logger, statReport, abortSignal });
          // 3. complete
          await mergeExtra({
            tableName: "Sage",
            id: sage.id,
            extra: { processing: false } satisfies SageExtra,
          });
        } catch (error) {
          await mergeExtra({
            tableName: "Sage",
            id: sage.id,
            extra: { processing: false, error: (error as Error).message } satisfies SageExtra,
          });
          // throw error;  // do not throw error
        }
      })(),
    );

    revalidatePath(`/sage/${sage.token}`);
    return { success: true, data: undefined };
  });
}

/**
 * Batch analyze recent sage chats for knowledge gaps
 * Triggered manually by expert in Sage Chats management page
 */
export async function discoverKnowledgeGapsAction({
  sageId,
  limit = 20,
}: {
  sageId: number;
  limit?: number;
}): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const sage = await prisma.sage
      .findUniqueOrThrow({
        where: { id: sageId, userId: user.id },
        select: { id: true, token: true, locale: true, extra: true },
      })
      .then(({ extra, ...sage }) => ({ ...sage, extra: extra as SageExtra }));

    // 超过 30 分钟可以重新开始
    if (sage.extra.processing && Date.now() - sage.extra.processing.startsAt < 30 * 60 * 1000) {
      return {
        success: false,
        message: "Sage is processing",
      };
    }

    const locale = VALID_LOCALES.includes(sage.locale as Locale)
      ? (sage.locale as Locale)
      : await getLocale();
    const logger = rootLogger.child({ sageId });
    const statReport: StatReporter = (async (dimension, value, extra) => {
      rootLogger.info({
        msg: `[LIMITED FREE] statReport: ${dimension}=${value}`,
        extra,
        note: "extractKnowledgeOnly is currently free - tokens not deducted",
      });
    }) as StatReporter;
    const abortSignal = new AbortController().signal;

    waitUntil(
      (async () => {
        await mergeExtra({
          tableName: "Sage",
          id: sage.id,
          extra: { processing: { startsAt: Date.now() }, error: null } satisfies SageExtra,
        });
        try {
          await discoverKnowledgeGapsFromSageChats({
            sageId,
            limit,
            locale,
            logger,
            statReport,
            abortSignal,
          });
          await mergeExtra({
            tableName: "Sage",
            id: sage.id,
            extra: { processing: false } satisfies SageExtra,
          });
        } catch (error) {
          await mergeExtra({
            tableName: "Sage",
            id: sage.id,
            extra: { processing: false, error: (error as Error).message } satisfies SageExtra,
          });
          // throw error;  // do not throw error
        }
      })(),
    );

    revalidatePath(`/sage/${sage.token}`);
    return { success: true, data: undefined };
  });
}
