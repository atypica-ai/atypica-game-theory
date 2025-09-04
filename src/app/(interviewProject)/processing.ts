import "server-only";

import { llm, providerOptions } from "@/ai/provider";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import { rootLogger } from "@/lib/logging";
import { InterviewProjectExtra } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { CoreMessage, streamText } from "ai";
import { getLocale } from "next-intl/server";
import { interviewQuestionRefinementPrompt } from "./prompt";
import { questionOptimizationTools } from "./tools";

export async function processInterviewQuestionOptimization(projectId: number): Promise<void> {
  const logger = rootLogger.child({ projectId });

  try {
    // Get project data
    const project = await prisma.interviewProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error(`InterviewProject ${projectId} not found`);
    }

    logger.info("Starting question optimization", { projectId });

    // Set processing status to true
    const currentExtra = (project.extra as InterviewProjectExtra) || {};
    await prisma.interviewProject.update({
      where: { id: projectId },
      data: {
        extra: {
          ...currentExtra,
          processing: true,
        } as InputJsonValue,
      },
    });

    const locale = await getLocale();

    // Initialize stats reporter
    const { statReport } = initInterviewProjectStatReporter({
      userId: project.userId,
      interviewProjectId: projectId,
      logger: logger,
    });

    const messages: CoreMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: project.brief,
          },
        ],
      },
    ];

    // Use streamText with updateQuestions tool
    await new Promise((resolve, reject) => {
      const response = streamText({
        model: llm("claude-3-7-sonnet"),
        providerOptions: {
          ...providerOptions,
        },
        system: interviewQuestionRefinementPrompt({ locale }),
        messages: messages,
        tools: questionOptimizationTools({ projectId }),
        toolChoice: {
          type: "tool",
          toolName: "updateQuestions",
        },
        maxSteps: 1,
        temperature: 0.3,
        onStepFinish: async (step) => {
          const { usage, stepType, toolCalls } = step;
          logger.info({
            msg: "processInterviewQuestionOptimization streamText onStepFinish",
            stepType,
            usage,
            toolCalls: toolCalls.map((call) => call.toolName),
          });
          if (usage.totalTokens > 0) {
            const tokens = usage.totalTokens;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const extra: any = {
              reportedBy: "question optimization",
              usage,
            };
            await statReport("tokens", tokens, extra);
          }
        },
        onFinish: async () => {
          logger.info("Question optimization completed successfully");
          resolve(null);
        },
        onError: ({ error }) => {
          logger.error(`Question optimization error: ${(error as Error).message}`);
          reject(error);
        },
      });

      response.consumeStream().catch((error) => reject(error));
    });

    // Clear processing status on success
    const updatedProject = await prisma.interviewProject.findUnique({
      where: { id: projectId },
    });

    if (updatedProject) {
      const updatedExtra = (updatedProject.extra as InterviewProjectExtra) || {};
      await prisma.interviewProject.update({
        where: { id: projectId },
        data: {
          extra: {
            ...updatedExtra,
            processing: false,
          } as InputJsonValue,
        },
      });
    }

    logger.info("Question optimization process completed successfully");
  } catch (error) {
    logger.error("Question optimization failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Clear processing status on error
    try {
      const project = await prisma.interviewProject.findUnique({
        where: { id: projectId },
      });

      if (project) {
        const currentExtra = (project.extra as InterviewProjectExtra) || {};
        await prisma.interviewProject.update({
          where: { id: projectId },
          data: {
            extra: {
              ...currentExtra,
              processing: false,
            } as InputJsonValue,
          },
        });
      }
    } catch (updateError) {
      logger.error("Failed to clear processing status", { updateError });
    }

    throw error;
  }
}
