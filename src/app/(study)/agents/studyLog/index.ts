import "server-only";

import { defaultProviderOptions, llm } from "@/ai/provider";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { calculateStepTokensUsage } from "@/ai/usage";
import { updateMemory } from "@/app/(memory)/lib/updateMemory";
import { generateRecommendedQuestions } from "@/app/(study)/study/StudyNextSteps/lib";
import { StudyToolName } from "@/app/(study)/tools/types";
import { Analyst } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { google } from "@ai-sdk/google";
import { waitUntil } from "@vercel/functions";
import { ModelMessage, streamText } from "ai";
import { Logger } from "pino";
import { studyLogSystem } from "./prompt";

function updateMemoryAfterStudyCompletion({
  userId,
  modelMessages,
  studyLog,
  logger,
}: {
  userId: number;
  modelMessages: ModelMessage[];
  studyLog: string;
  logger: Logger;
}) {
  const filteredUserMessages: ModelMessage[] = modelMessages.flatMap((message) => {
    if (message.role === "user") {
      const content =
        typeof message.content === "string"
          ? [{ type: "text", text: message.content }]
          : message.content.filter((content) => content.type === "text");
      return content.length ? ([{ ...message, content }] as ModelMessage[]) : [];
    } else if (message.role === "assistant" && Array.isArray(message.content)) {
      const content = message.content.filter(
        (content) =>
          (content.type === "tool-call" || content.type === "tool-result") &&
          content.toolName === StudyToolName.requestInteraction,
      );
      return content.length ? ([{ ...message, content }] as ModelMessage[]) : [];
    } else if (message.role === "tool") {
      const content = message.content.filter(
        (content) => content.toolName === StudyToolName.requestInteraction,
      );
      return content.length ? ([{ ...message, content }] as ModelMessage[]) : [];
    } else {
      return [];
    }
  });

  waitUntil(
    updateMemory({
      userId,
      conversationContext: [
        ...filteredUserMessages,
        {
          role: "assistant",
          content: [
            { type: "text", text: "Study Log Generated" },
            { type: "text", text: studyLog },
          ],
        },
      ],
      logger: logger.child({ operation: "updateMemory after studyLog" }),
    }).catch((error) => {
      logger.error({
        msg: "Failed to update user memory after studyLog",
        error: error instanceof Error ? error.message : String(error),
      });
    }),
  );
  logger.info("Triggered memory update after studyLog completion");
}

export async function generateAndSaveStudyLog({
  analyst,
  messages,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  analyst: Pick<Analyst, "id" | "userId">;
  messages: ModelMessage[];
} & AgentToolConfigArgs): Promise<{ studyLog: string }> {
  const systemPrompt = studyLogSystem({ locale });

  // 架构变更说明：
  // 1. 不再需要从 analyst.interviews.conclusion 读取访谈结论
  //    - 之前 interviewChat 只返回简短的 digest，需要从数据库读取详细的 conclusion
  //    - 现在 interviewChat 返回详细的 summary (与 discussionChat 一致)
  //    - 所有研究内容(包括访谈总结、讨论总结)都已包含在 messages 中
  // 2. 不再需要在 prologue 中放置研究的 topic, brief, summary 等详细信息
  //    - messages 已经包含完整的研究过程上下文
  //    - 只需一句简单的开场指令即可
  // 3. 参数里的 messages 是 tool execute 的时候带过来的处理过 toModelOutput 的 modelmessages，
  //    所以，只包含了 plainText 的内容，无需重新提取

  const promise = new Promise<{ studyLog: string }>(async (resolve, reject) => {
    // 将完整的研究过程 messages 传递给模型，追加一条简单的任务指令
    const studyLogMessages = [
      ...messages,
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text:
              locale === "zh-CN"
                ? "请基于以上研究过程，生成一份详细的研究日志。"
                : "Please generate a detailed study log based on the research process above.",
          },
        ],
      },
    ];

    const response = streamText({
      model: llm("gemini-2.5-pro"),
      providerOptions: defaultProviderOptions,
      tools: {
        google_search: google.tools.googleSearch({
          mode: "MODE_DYNAMIC",
          dynamicThreshold: 0, // threshold 越小，使用搜索的可能性就越高，0就是一定会搜索
        }),
      },
      system: systemPrompt,
      messages: studyLogMessages,
      // maxTokens: 500,
      // onChunk: (chunk) => console.log("[Reasoning]", JSON.stringify(chunk)),
      onFinish: async (result) => {
        // const reasoning = result.reasoning ?? "";
        // const text = result.text ?? "";
        // resolve({ reasoning, text, plainText: text });
        const { tokens, extra } = calculateStepTokensUsage(result);
        const studyLog = result.text ?? "";
        logger.info({
          msg: "studyLog streamText onFinish",
          finishReason: result.finishReason,
          usage: extra.usage,
          cache: extra.cache,
        });
        if (statReport) {
          await statReport("tokens", tokens, { reportedBy: "studyLog tool", ...extra });
        }
        await prisma.analyst.update({
          where: { id: analyst.id },
          data: { studyLog: studyLog },
        });

        // Trigger recommended questions generation in background after studyLog is complete
        // 在 studyLog 完成后，在后台触发推荐问题生成
        waitUntil(
          generateRecommendedQuestions({
            analystId: analyst.id,
            locale,
            forceRegenerate: false,
          }),
        );
        logger.info("Triggered recommended questions generation after studyLog completion");

        // Update user memory after study completion, 在研究完成后更新用户记忆，不需要 await
        updateMemoryAfterStudyCompletion({
          userId: analyst.userId,
          modelMessages: messages,
          studyLog,
          logger,
        });

        resolve({ studyLog });
      },
      onError: ({ error }) => {
        logger.error(`studyLog streamText onError: ${(error as Error).message}`);
        reject(error);
      },
      abortSignal,
    });
    await response.consumeStream();
  });

  return await promise;
}
