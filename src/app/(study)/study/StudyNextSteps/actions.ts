"use server";

import { llm } from "@/ai/provider";
import { VALID_LOCALES } from "@/i18n/routing";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystExtra } from "@/prisma/client";
import { InputJsonObject } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { generateObject } from "ai";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { z } from "zod";

const recommendedQuestionsSchema = z.object({
  questions: z
    .array(z.string().describe("A research question / 一个研究问题"))
    .length(2)
    .describe("Two follow-up research questions / 两个后续研究问题"),
});

/**
 * Generate and cache recommended research questions based on the study
 * 基于研究生成并缓存推荐的研究问题
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

    const studyLog = rootLogger.child({ studyUserChatId: studyUserChat.id, studyUserChatToken });

    const { analyst } = studyUserChat;

    // Determine locale
    const locale: Locale =
      analyst.locale && VALID_LOCALES.includes(analyst.locale as Locale)
        ? (analyst.locale as Locale)
        : await getLocale();

    // Check if we already have cached questions in analyst.extra
    const analystExtra = analyst.extra as AnalystExtra;

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

    // If already processing, return processing status
    if (analystExtra.recommendedStudies?.processing) {
      return {
        success: false,
        message: "Questions are being generated",
      };
    }

    // Set processing status
    await prisma.analyst.update({
      where: { id: analyst.id },
      data: {
        extra: {
          ...analystExtra,
          recommendedStudies: {
            processing: true,
          },
        } as AnalystExtra as InputJsonObject,
      },
    });

    // Generate new questions using AI
    const systemPrompt =
      locale === "zh-CN"
        ? `你是一个研究助手，帮助生成后续研究问题。根据提供的研究信息，建议2个相关且有趣的后续研究问题。`
        : `You are a research assistant helping generate follow-up research questions. Based on the study information provided, suggest 2 relevant and interesting follow-up research questions.`;

    const userPrompt =
      locale === "zh-CN"
        ? `<研究信息>
<简述>${analyst.brief}</简述>
<主题>${analyst.topic.slice(0, 2000)}</主题>
<研究日志>${analyst.studyLog.slice(0, 10000)}</研究日志>
</研究信息>

请生成2个后续研究问题。`
        : `<study_information>
<brief>${analyst.brief}</brief>
<topic>${analyst.topic.slice(0, 2000)}</topic>
<study_log>${analyst.studyLog.slice(0, 10000)}</study_log>
</study_information>

Please generate 2 follow-up research questions.`;

    const result = await generateObject({
      model: llm("gpt-5-mini"),
      schema: recommendedQuestionsSchema,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const questions = result.object.questions;

    // Cache the questions in analyst.extra and remove processing flag
    await prisma.analyst.update({
      where: { id: analyst.id },
      data: {
        extra: {
          ...analystExtra,
          recommendedStudies: {
            questions,
            generatedAt: new Date().toISOString(),
          },
        } as AnalystExtra as InputJsonObject,
      },
    });

    studyLog.info(`Generated recommended questions for analyst ${analyst.id}`);

    return {
      success: true,
      data: { questions },
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
