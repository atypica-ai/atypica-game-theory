"use server";
import { StatReporter } from "@/ai/tools/types";
import { discoverKnowledgeGapsFromSageChats } from "@/app/(sage)/processing/gaps";
import { extractKnowledgeFromSources } from "@/app/(sage)/processing/memory";
import { processSageSources } from "@/app/(sage)/processing/sources";
import type { SageExtra, SageInterviewExtra } from "@/app/(sage)/types";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { waitUntil } from "@vercel/functions";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { resolveGaps } from "./processing/followup";

/**
 * Clean text for chat title by extracting main content and removing markdown formatting
 */
function cleanTextForTitle(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "") // Remove markdown headers (# ## ###)
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // Remove markdown bold (**text** or __text__)
    .replace(/(\*|_)(.*?)\1/g, "$2") // Remove markdown italic (*text* or _text_)
    .replace(/^\s*[-*+]\s+/gm, "") // Remove bullet points and list markers (- * +)
    .replace(/^\s*\d+\.\s+/gm, "") // Remove numbered lists (1. 2. etc.)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove markdown links [text](url) -> text
    .replace(/[^\p{L}\p{N}\s.,，。！？:：]/gu, "") // Remove remaining special characters except basic punctuation
    .replace(/\s+/g, " ") // Replace multiple consecutive spaces/newlines with single space
    .trim() // Trim whitespace
    .substring(0, 100); // Limit length to prevent overly long titles
}

/**
 * End sage interview - triggered by manual user action
 * Performs gap resolution and adds working memory (if gaps resolved)
 */
export async function endSageInterviewAction(
  sageInterviewId: number,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // Get interview and verify ownership
    const { sage, userChat, ...sageInterview } = await prisma.sageInterview
      .findUniqueOrThrow({
        where: {
          id: sageInterviewId,
          sage: { userId: user.id },
        },
        include: {
          sage: {
            select: {
              id: true,
              token: true,
              locale: true,
            },
          },
          userChat: {
            select: {
              id: true,
              token: true,
            },
          },
        },
      })
      .then(({ extra, ...sage }) => ({ ...sage, extra: extra as SageExtra }));

    // Check if interview is already completed
    const extra = sageInterview.extra as SageInterviewExtra;
    if (!extra.ongoing) {
      return {
        success: false,
        message: "Interview has already been completed",
        code: "internal_server_error",
      };
    }

    const locale = VALID_LOCALES.includes(sage.locale as Locale)
      ? (sage.locale as Locale)
      : await getLocale();
    const logger = rootLogger.child({ sageId: sage.id });
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
          const { workingMemoryContent } = await resolveGaps({
            sageId: sage.id,
            sageInterviewId,
            userChat: {
              id: userChat.id,
              token: userChat.token,
            },
            locale,
            logger,
            statReport,
            abortSignal,
          });
          const userChatTitle = cleanTextForTitle(workingMemoryContent);
          await Promise.all([
            mergeExtra({
              tableName: "Sage",
              id: sage.id,
              extra: { processing: false } satisfies SageExtra,
            }),
            mergeExtra({
              tableName: "SageInterview",
              id: sageInterviewId,
              extra: { ongoing: false } satisfies SageInterviewExtra,
            }),
            prisma.userChat.update({ where: { id: userChat.id }, data: { title: userChatTitle } }),
          ]);
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
