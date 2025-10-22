"use server";

import { llm } from "@/ai/provider";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystExtra } from "@/prisma/client";
import { InputJsonObject } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { generateObject } from "ai";
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
  studyUserChatId: number,
  forceRegenerate = false,
): Promise<ServerActionResult<{ questions: string[] }>> {
  try {
    // Get analyst data via studyUserChat
    const studyUserChat = await prisma.userChat.findUnique({
      where: { id: studyUserChatId, kind: "study" },
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

    const { analyst } = studyUserChat;

    // Check if we already have cached questions in analyst.extra
    const analystExtra = analyst.extra as AnalystExtra;

    // If not forcing regenerate and we have cached questions, return them
    if (!forceRegenerate && analystExtra.recommendedStudies?.questions && !analystExtra.recommendedStudies.processing) {
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
    const result = await generateObject({
      model: llm("gpt-5-mini"),
      schema: recommendedQuestionsSchema,
      messages: [
        {
          role: "system",
          content: `You are a research assistant helping generate follow-up research questions.
Based on the study information provided, suggest 2 relevant and interesting follow-up research questions.

你是一个研究助手，帮助生成后续研究问题。
根据提供的研究信息，建议2个相关且有趣的后续研究问题。`,
        },
        {
          role: "user",
          content: `Study Information / 研究信息:

Brief / 简述: ${analyst.brief}

Topic / 主题: ${analyst.topic}

Study Log / 研究日志:
${analyst.studyLog.slice(0, 2000)}

Please generate 2 follow-up research questions.
请生成2个后续研究问题。`,
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

    rootLogger.info(
      `Generated recommended questions for analyst ${analyst.id}: ${JSON.stringify(questions)}`,
    );

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
