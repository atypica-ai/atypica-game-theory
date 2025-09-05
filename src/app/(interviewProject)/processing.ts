import "server-only";

import { llm, providerOptions } from "@/ai/provider";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { InterviewProjectExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { CoreMessage, streamText } from "ai";
import { interviewQuestionRefinementPrompt } from "./prompt";
import { questionOptimizationTools } from "./tools";

export async function processInterviewQuestionOptimization(projectId: number): Promise<void> {
  const logger = rootLogger.child({ projectId });

  // Get project data
  let project = await prisma.interviewProject
    .findUniqueOrThrow({ where: { id: projectId } })
    .then(({ extra, ...project }) => ({ ...project, extra: extra as InterviewProjectExtra }));

  // Set processing status to true
  project = await prisma.interviewProject
    .update({
      where: { id: projectId },
      data: {
        extra: { ...project.extra, processing: true },
      },
    })
    .then(({ extra, ...project }) => ({ ...project, extra: extra as InterviewProjectExtra }));

  // 优先使用 brief 一样的语言
  const locale = await detectInputLanguage({ text: project.brief });

  // Initialize stats reporter
  const { statReport } = initInterviewProjectStatReporter({
    userId: project.userId,
    interviewProjectId: projectId,
    logger: logger,
  });

  const messages: CoreMessage[] = [
    {
      role: "user",
      content: [{ type: "text", text: project.brief }],
    },
  ];

  try {
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

    project = await prisma.interviewProject
      .update({
        where: { id: projectId },
        data: {
          extra: { ...project.extra, processing: false },
        },
      })
      .then(({ extra, ...project }) => ({ ...project, extra: extra as InterviewProjectExtra }));

    logger.info("Question optimization process completed successfully");
  } catch (error) {
    logger.error(`Question optimization failed: ${(error as Error).message}`);

    // Clear processing status on error
    project = await prisma.interviewProject
      .update({
        where: { id: projectId },
        data: {
          extra: {
            ...project.extra,
            error: (error as Error).message,
            processing: false,
          },
        },
      })
      .then(({ extra, ...project }) => ({ ...project, extra: extra as InterviewProjectExtra }));

    throw error;
  }
}
