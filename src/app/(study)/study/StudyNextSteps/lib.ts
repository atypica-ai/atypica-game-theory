import "server-only";

import { llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { generateObject } from "ai";
import { Locale } from "next-intl";
import { z } from "zod";

const recommendedQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        title: z
          .string()
          .describe(
            "A concise title (10-20 Chinese characters, or 6-12 English words) / 简洁的标题（10-20个中文字，或6-12个英文单词）",
          ),
        brief: z
          .string()
          .describe(
            "A concise question (MAX 200 Chinese characters, or MAX 100 English words) / 简洁的问题（最多200个中文字，或最多100个英文单词）",
          ),
      }),
    )
    .length(2)
    .describe("Two follow-up research questions / 两个后续研究问题"),
  // Legacy field - kept for backward compatibility but not used
  // questions_legacy: z.array(z.string()).optional(),
});

/**
 * Core logic to generate recommended research questions
 * This function runs in the background and continues even if the request is disconnected
 *
 * 核心逻辑：生成推荐研究问题
 * 此函数在后台运行，即使请求断开也会继续执行
 */
export async function generateRecommendedQuestions({
  userChatId,
  studyLog,
  locale,
  forceRegenerate = false,
}: {
  userChatId: number;
  studyLog: string;
  locale: Locale;
  forceRegenerate?: boolean;
}): Promise<{ success: boolean; questions?: Array<{ title: string; brief: string }> }> {
  const logger = rootLogger.child({ userChatId, task: "generateRecommendedQuestions" });

  try {
    // Get analyst data
    const userChat = await prisma.userChat.findUnique({
      where: { id: userChatId },
    });

    if (!userChat) {
      logger.error("UserChat not found");
      return { success: false };
    }

    const userChatExtra = userChat.extra as UserChatExtra;

    // If not forcing regenerate and we have cached questions without processing, return early
    if (
      !forceRegenerate &&
      userChatExtra.recommendedStudies?.questions &&
      !userChatExtra.recommendedStudies.processing
    ) {
      logger.info("Using cached questions");
      return {
        success: true,
        questions: userChatExtra.recommendedStudies.questions,
      };
    }

    // Check if already processing (with timeout check - 10 minutes)
    if (userChatExtra.recommendedStudies?.processing) {
      const processingStartTime = parseInt(userChatExtra.recommendedStudies.processing, 10);
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;

      // If processing started less than 10 minutes ago and not forcing, skip
      if (!forceRegenerate && now - processingStartTime < tenMinutes) {
        logger.info("Already processing, skipping");
        return { success: false };
      }

      // If timeout or forcing, continue and overwrite
      logger.info("Processing timeout or force regenerate, continuing");
    }

    // Set processing status with current timestamp
    await mergeExtra({
      tableName: "UserChat",
      id: userChat.id,
      extra: {
        recommendedStudies: {
          processing: Date.now().toString(),
        },
      } satisfies UserChatExtra,
    });

    // Generate new questions using AI
    const systemPrompt =
      locale === "zh-CN"
        ? `你是一个研究助手，帮助生成后续研究问题。根据提供的研究信息，建议2个相关且有趣的后续研究问题。

每个研究问题需要包含：
1. title: 简洁的标题（10-20个中文字），清晰表达研究主题
2. brief: 详细的研究问题描述（最多200个中文字），清楚描述研究目标和具体需求`
        : `You are a research assistant helping generate follow-up research questions. Based on the study information provided, suggest 2 relevant and interesting follow-up research questions.

Each research question should include:
1. title: Concise title (6-12 English words) that clearly expresses the research topic
2. brief: Detailed research question description (MAX 100 English words) describing research objectives and specific needs`;

    const userPrompt =
      locale === "zh-CN"
        ? `
<studyLog>
${studyLog.slice(0, 10000)}
</studyLog>

请生成2个后续研究问题，每个包含 title 和 brief。`
        : `
<studyLog>
${studyLog.slice(0, 10000)}
</studyLog>

Please generate 2 follow-up research questions, each with title and brief.`;

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

    // Save questions and remove processing flag
    await mergeExtra({
      tableName: "UserChat",
      id: userChat.id,
      extra: {
        recommendedStudies: {
          questions,
          generatedAt: new Date().toISOString(),
        },
      } satisfies UserChatExtra,
    });

    logger.info(`Successfully generated recommended questions for userChat ${userChat.id}`);

    return {
      success: true,
      questions,
    };
  } catch (error) {
    logger.error(`Failed to generate recommended questions: ${(error as Error).message}`);

    // Clear processing flag on error by removing it from recommendedStudies
    try {
      // Use #- operator to remove the nested processing key
      await prisma.$executeRaw`
        UPDATE "UserChat"
        SET "extra" = "extra" #- '{recommendedStudies,processing}'
        WHERE "id" = ${userChatId}
      `;
    } catch (cleanupError) {
      logger.error(`Failed to clear processing flag: ${(cleanupError as Error).message}`);
    }

    return { success: false };
  }
}
