import "server-only";

import { llm, providerOptions } from "@/ai/provider";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import { rootLogger } from "@/lib/logging";
import { detectInputLanguage } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { ModelMessage, stepCountIs, streamText } from "ai";
import { interviewQuestionRefinementPrompt } from "./prompt";
import { questionOptimizationTools } from "./tools";

export async function processInterviewQuestionOptimization(projectId: number): Promise<void> {
  const logger = rootLogger.child({ projectId });

  // Get project data
  const project = await prisma.interviewProject.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      id: true,
      brief: true,
      userId: true,
    },
  });

  // Set processing status to true
  await prisma.$executeRaw`
    UPDATE "InterviewProject"
    SET extra = jsonb_set(extra, '{processing}', 'true', true)
    WHERE id = ${projectId}
  `;

  // 优先使用 brief 一样的语言
  const locale = await detectInputLanguage({ text: project.brief });

  // Initialize stats reporter
  const { statReport } = initInterviewProjectStatReporter({
    userId: project.userId,
    interviewProjectId: projectId,
    logger: logger,
  });

  const messages: ModelMessage[] = [
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

        stopWhen: stepCountIs(1),
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

    // ⚠️ 这里要额外注意，因为上面 questionOptimizationTools 里也会往 extra 里面写数据，
    // 这里通过 { ...project.extra, processing: false } 这样的方式写数据是不安全的，会覆盖 questionOptimizationTools 写入的内容
    // 安全的做法是使用 raw sql 直接更新 json 的一个字段

    await prisma.$executeRaw`
      UPDATE "InterviewProject"
      SET extra = extra - 'processing'
      WHERE id = ${projectId}
    `;
    logger.info("Question optimization process completed successfully");
  } catch (error) {
    logger.error(`Question optimization failed: ${(error as Error).message}`);
    await prisma.$executeRaw`
      UPDATE "InterviewProject"
      SET extra = jsonb_set(extra - 'processing', '{error}', ${JSON.stringify((error as Error).message)})
      WHERE id = ${projectId}
    `;
    throw error;
  }
}
