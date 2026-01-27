"use server";

import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { UserChatExtra } from "@/prisma/client";
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
): Promise<
  ServerActionResult<
    | { availableForNextSteps: false }
    | {
        availableForNextSteps: true;
        questions: Array<{ title: string; brief: string }>;
      }
  >
> {
  try {
    const userChat = await prisma.userChat.findUnique({
      where: { token: studyUserChatToken, kind: "study" },
      include: {
        analyst: true,
      },
    });

    if (!userChat?.analyst?.studyLog) {
      return {
        success: true,
        data: {
          availableForNextSteps: false,
        },
      };
    }

    const logger = rootLogger.child({ studyUserChatId: userChat.id, studyUserChatToken });

    const studyLog = userChat.analyst.studyLog;

    // Determine locale
    const locale: Locale =
      userChat.analyst.locale && VALID_LOCALES.includes(userChat.analyst.locale as Locale)
        ? (userChat.analyst.locale as Locale)
        : await getLocale();

    // Check if we already have cached questions in analyst.extra
    let userChatExtra = userChat.extra as UserChatExtra;

    // If not forcing regenerate and we have cached questions, return them
    if (
      !forceRegenerate &&
      userChatExtra.recommendedStudies?.questions &&
      !userChatExtra.recommendedStudies.processing
    ) {
      return {
        success: true,
        data: {
          availableForNextSteps: true,
          questions: userChatExtra.recommendedStudies.questions,
        },
      };
    }

    // Check if already processing (with timeout check - 10 minutes)
    if (userChatExtra.recommendedStudies?.processing) {
      const processingStartTime = parseInt(userChatExtra.recommendedStudies.processing, 10);
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
            studyLog,
            userChatId: userChat.id,
            locale,
            forceRegenerate: true,
          }),
        );
      }
    } else {
      // Not processing, trigger background generation
      logger.info(`Triggering background generation for userChat ${userChat.id}`);
      waitUntil(
        generateRecommendedQuestions({
          studyLog,
          userChatId: userChat.id,
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

      const updatedUserChat = await prisma.userChat.findUnique({
        where: { id: userChat.id },
      });

      if (!updatedUserChat) {
        break;
      }

      userChatExtra = updatedUserChat.extra as UserChatExtra;

      // If questions are ready and not processing, return them
      if (
        userChatExtra.recommendedStudies?.questions &&
        !userChatExtra.recommendedStudies.processing
      ) {
        logger.info("Questions generated successfully");
        return {
          success: true,
          data: {
            availableForNextSteps: true,
            questions: userChatExtra.recommendedStudies.questions,
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

// /**
//  * Check if the study is available for next steps (recommendations, podcast, reference)
//  * 检查研究是否可用于下一步操作（推荐问题、播客、作为参考）
//  */
// export async function checkStudyAvailableForNextSteps(
//   studyUserChatToken: string,
// ): Promise<ServerActionResult<{ available: boolean }>> {
//   const studyUserChat = await prisma.userChat.findUnique({
//     where: { token: studyUserChatToken, kind: "study" },
//     select: {
//       analyst: {
//         select: {
//           studyLog: true,
//         },
//       },
//     },
//   });
//   if (!studyUserChat) {
//     return {
//       success: false,
//       code: "not_found",
//       message: "Study not found",
//     };
//   }
//   // Study is available if analyst exists and has both studyLog and at least one report
//   const available = !!(
//     studyUserChat.analyst?.studyLog && studyUserChat.analyst.studyLog.length > 0
//   );
//   return {
//     success: true,
//     data: { available },
//   };
// }
