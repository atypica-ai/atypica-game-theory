import "server-only";

import { llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { AnalystExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
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
  analystId,
  locale,
  forceRegenerate = false,
}: {
  analystId: number;
  locale: Locale;
  forceRegenerate?: boolean;
}): Promise<{ success: boolean; questions?: Array<{ title: string; brief: string }> }> {
  const logger = rootLogger.child({ analystId, task: "generateRecommendedQuestions" });

  try {
    // Get analyst data
    const analyst = await prisma.analyst.findUnique({
      where: { id: analystId },
    });

    if (!analyst) {
      logger.error("Analyst not found");
      return { success: false };
    }

    const analystExtra = analyst.extra as AnalystExtra;

    // If not forcing regenerate and we have cached questions without processing, return early
    if (
      !forceRegenerate &&
      analystExtra.recommendedStudies?.questions &&
      !analystExtra.recommendedStudies.processing
    ) {
      logger.info("Using cached questions");
      return {
        success: true,
        questions: analystExtra.recommendedStudies.questions,
      };
    }

    // Check if already processing (with timeout check - 10 minutes)
    if (analystExtra.recommendedStudies?.processing) {
      const processingStartTime = parseInt(analystExtra.recommendedStudies.processing, 10);
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
    // Use || operator to safely merge extra field without overwriting other values
    await prisma.$executeRaw`
      UPDATE "Analyst"
      SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({
        recommendedStudies: {
          processing: Date.now().toString(),
        },
      })}::jsonb
      WHERE "id" = ${analystId}
    `;

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
        ? `<研究信息>
<简述>${analyst.brief}</简述>
<主题>${analyst.topic.slice(0, 2000)}</主题>
<研究日志>${analyst.studyLog.slice(0, 10000)}</研究日志>
</研究信息>

请生成2个后续研究问题，每个包含 title 和 brief。`
        : `<study_information>
<brief>${analyst.brief}</brief>
<topic>${analyst.topic.slice(0, 2000)}</topic>
<study_log>${analyst.studyLog.slice(0, 10000)}</study_log>
</study_information>

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

    // Cache the questions and remove processing flag
    // Use || operator to safely merge, only including the fields we want
    await prisma.$executeRaw`
      UPDATE "Analyst"
      SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({
        recommendedStudies: {
          questions,
          generatedAt: new Date().toISOString(),
        },
      })}::jsonb
      WHERE "id" = ${analystId}
    `;

    logger.info(`Successfully generated recommended questions for analyst ${analystId}`);

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
        UPDATE "Analyst"
        SET "extra" = "extra" #- '{recommendedStudies,processing}'
        WHERE "id" = ${analystId}
      `;
    } catch (cleanupError) {
      logger.error(`Failed to clear processing flag: ${(cleanupError as Error).message}`);
    }

    return { success: false };
  }
}
