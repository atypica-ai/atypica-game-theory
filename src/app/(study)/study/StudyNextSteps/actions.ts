"use server";

import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { generateRecommendedQuestions } from "./lib";

/**
 * Generate and cache recommended research questions based on the study
 * Server action handles permission checking and data preparation,
 * then triggers background generation using waitUntil and polls for results
 *
 * 基于研究生成并缓存推荐的研究问题
 * Server action 负责权限检查和数据准备，使用 waitUntil 触发后台生成，并轮询结果
 */
export async function generateRecommendedQuestionsAction(
  studyUserChatToken: string,
  forceRegenerate = false,
): Promise<ServerActionResult<{ questions: string[] }>> {
  try {
    // Get analyst data via studyUserChat
    const studyUserChat = await prisma.userChat.findUnique({
      where: { token: studyUserChatToken, kind: "study" },
      include: {
        analyst: true,
      },
    });

    if (!studyUserChat?.analyst) {
      return {
        success: false,
        code: "not_found",
        message: "Analyst not found for this study",
      };
    }

    const logger = rootLogger.child({ studyUserChatId: studyUserChat.id, studyUserChatToken });
    const { analyst } = studyUserChat;

    // Determine locale
    const locale: Locale =
      analyst.locale && VALID_LOCALES.includes(analyst.locale as Locale)
        ? (analyst.locale as Locale)
        : await getLocale();

    // Check if we already have cached questions in analyst.extra
    let analystExtra = analyst.extra as AnalystExtra;

    // If not forcing regenerate and we have cached questions, return them
    if (
      !forceRegenerate &&
      analystExtra.recommendedStudies?.questions &&
      !analystExtra.recommendedStudies.processing
    ) {
      return {
        success: true,
        data: {
          questions: analystExtra.recommendedStudies.questions,
        },
      };
    }

    // Check if already processing (with timeout check - 10 minutes)
    if (analystExtra.recommendedStudies?.processing) {
      const processingStartTime = parseInt(analystExtra.recommendedStudies.processing, 10);
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;

      // If not forcing and within timeout, just poll for results
      if (!forceRegenerate && now - processingStartTime < tenMinutes) {
        logger.info("Already processing, polling for results");
      } else {
        // Timeout or forcing, trigger new generation
        logger.info("Processing timeout or force regenerate, triggering new generation");
        waitUntil(
          generateRecommendedQuestions({
            analystId: analyst.id,
            locale,
            forceRegenerate: true,
          }),
        );
      }
    } else {
      // Not processing, trigger background generation
      logger.info(`Triggering background generation for analyst ${analyst.id}`);
      waitUntil(
        generateRecommendedQuestions({
          analystId: analyst.id,
          locale,
          forceRegenerate,
        }),
      );
    }

    // Poll for results (check every 2 seconds, max 60 seconds)
    const maxPolls = 30;
    const pollInterval = 2000;

    for (let i = 0; i < maxPolls; i++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const updatedAnalyst = await prisma.analyst.findUnique({
        where: { id: analyst.id },
      });

      if (!updatedAnalyst) {
        break;
      }

      analystExtra = updatedAnalyst.extra as AnalystExtra;

      // If questions are ready and not processing, return them
      if (analystExtra.recommendedStudies?.questions && !analystExtra.recommendedStudies.processing) {
        logger.info("Questions generated successfully");
        return {
          success: true,
          data: {
            questions: analystExtra.recommendedStudies.questions,
          },
        };
      }
    }

    // Polling timeout - return error but background task continues
    logger.warn("Polling timeout, but background generation continues");
    return {
      success: false,
      message: "Questions are being generated in the background, please try again later",
    };
  } catch (error) {
    rootLogger.error(`Failed to generate recommended questions: ${(error as Error).message}`);
    return {
      success: false,
      code: "internal_server_error",
      message: "Failed to generate recommended questions",
    };
  }
}

/**
 * Generate podcast for a completed study
 */
export async function generatePodcastAction(studyUserChatId: number) {
  // TODO: Implement podcast generation
  console.log("Generating podcast for study:", studyUserChatId);
  return { success: true };
}

/**
 * Create a new study with a given question
 */
export async function startNewResearchAction(question: string) {
  // TODO: Implement new study creation
  console.log("Starting new research with question:", question);
  return { success: true, studyId: null };
}

/**
 * Check if the study is available for next steps (recommendations, podcast, reference)
 * 检查研究是否可用于下一步操作（推荐问题、播客、作为参考）
 */
export async function checkStudyAvailableForNextSteps(
  studyUserChatToken: string,
): Promise<ServerActionResult<{ available: boolean }>> {
  const studyUserChat = await prisma.userChat.findUnique({
    where: { token: studyUserChatToken, kind: "study" },
    include: {
      analyst: {
        select: {
          studyLog: true,
          reports: {
            take: 1,
          },
        },
      },
    },
  });

  if (!studyUserChat) {
    return {
      success: false,
      code: "not_found",
      message: "Study not found",
    };
  }

  // Study is available if analyst exists and has both studyLog and at least one report
  const available = !!(
    studyUserChat.analyst?.studyLog &&
    studyUserChat.analyst.studyLog.length > 0 &&
    studyUserChat.analyst.reports &&
    studyUserChat.analyst.reports.length > 0
  );

  return {
    success: true,
    data: { available },
  };
}
