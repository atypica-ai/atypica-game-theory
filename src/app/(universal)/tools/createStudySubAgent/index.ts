import "server-only";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { initStudyStatReporter } from "@/ai/tools/stats";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { executeBaseAgentRequest } from "@/app/(study)/agents/baseAgentRequest";
import { createStudyAgentConfig } from "@/app/(study)/agents/configs/studyAgentConfig";
import { UserChatContext } from "@/app/(study)/context/types";
import { StudyToolName } from "@/app/(study)/tools/types";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { generateId, tool } from "ai";
import {
  createStudySubAgentInputSchema,
  createStudySubAgentOutputSchema,
  type CreateStudySubAgentToolResult,
} from "./types";

function buildSubAgentHardRequirementPrompt(locale: string) {
  if (locale === "zh-CN") {
    return `
## SubAgent 强制执行要求（必须遵守）
1. 在结束任务前，至少执行一次 \`interviewChat\`。
2. 在结束任务前，必须执行一次 \`generateReport\` 并产出 reportToken。
3. 只有在完成“访谈 + 报告生成”后，才允许输出最终总结。
4. 不要向用户请求交互确认，直接自主完成研究与报告产出。`;
  }
  return `
## Mandatory SubAgent Execution Requirements
1. You MUST run \`interviewChat\` at least once before ending.
2. You MUST run \`generateReport\` once and produce a reportToken before ending.
3. You may output the final summary only after both interview and report generation are complete.
4. Do not pause for user-interaction confirmation; finish the workflow autonomously.`;
}

function extractTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(
      (part): part is { type: string; text?: string } =>
        !!part && typeof part === "object" && "type" in part,
    )
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

async function getLatestAssistantText(userChatId: number): Promise<string> {
  const messages = await prisma.chatMessage.findMany({
    where: { userChatId, role: "assistant" },
    orderBy: { id: "desc" },
    take: 8,
    select: { parts: true },
  });

  for (const message of messages) {
    const text = extractTextFromParts(message.parts);
    if (text) return text;
  }

  return "";
}

async function hasAnyReportToken(userChatId: number): Promise<boolean> {
  const userChat = await prisma.userChat.findUnique({
    where: { id: userChatId },
    select: { context: true },
  });
  const context = userChat?.context as { reportTokens?: unknown } | null;
  const reportTokens = Array.isArray(context?.reportTokens)
    ? context.reportTokens.filter((token): token is string => typeof token === "string")
    : [];
  return reportTokens.length > 0;
}

export const createStudySubAgentTool = ({
  userId,
  teamId,
  locale,
  logger,
}: {
  userId: number;
  teamId: number | null;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Create and run a Study sub-agent for one focused research task. Use this as the main execution path for interview/discussion/report style study work.",
    inputSchema: createStudySubAgentInputSchema,
    outputSchema: createStudySubAgentOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => ({
      type: "text",
      value: result.plainText,
    }),
    execute: async ({
      taskRequirement,
      outputFormat,
      subAgentTitle,
    }): Promise<CreateStudySubAgentToolResult> => {
      let subAgentChat: Awaited<ReturnType<typeof createUserChat>> | null = null;

      try {
        const title = truncateForTitle(subAgentTitle || taskRequirement, {
          maxDisplayWidth: 100,
          suffix: "...",
        });

        subAgentChat = await createUserChat({
          userId,
          kind: "study",
          title,
          context: {
            defaultLocale: locale,
          } satisfies UserChatContext,
        });

        const subAgentLogger = logger.child({
          tool: "createStudySubAgent",
          subAgentChatId: subAgentChat.id,
          subAgentChatToken: subAgentChat.token,
        });
        const chat = subAgentChat;

        await persistentAIMessageToDB({
          mode: "append",
          userChatId: chat.id,
          message: {
            id: generateId(),
            role: "user",
            parts: [
              {
                type: "text",
                text: `${taskRequirement}\n\nOutput format:\n${outputFormat}`,
              },
            ],
          },
        });

        const { statReport } = initStudyStatReporter({
          userId,
          studyUserChatId: chat.id,
          logger: subAgentLogger,
        });

        const runSubAgent = async () => {
          const runOnce = async (forcedInstruction?: string) => {
            if (forcedInstruction) {
              await persistentAIMessageToDB({
                mode: "append",
                userChatId: chat.id,
                message: {
                  id: generateId(),
                  role: "user",
                  parts: [{ type: "text", text: forcedInstruction }],
                },
              });
            }

            await executeBaseAgentRequest(
              {
                userId,
                teamId,
                studyUserChatId: chat.id,
                userChatContext: {
                  defaultLocale: locale,
                },
                locale,
                logger: subAgentLogger,
                statReport,
              },
              async (toolAbortSignal) => {
                const config = await createStudyAgentConfig({
                  userId,
                  studyUserChatId: chat.id,
                  userChatContext: {
                    defaultLocale: locale,
                  },
                  locale,
                  logger: subAgentLogger,
                  statReport,
                  toolAbortSignal,
                });
                const toolsWithoutInteraction = Object.fromEntries(
                  Object.entries(config.tools).filter(
                    ([toolName]) => toolName !== StudyToolName.requestInteraction,
                  ),
                ) as typeof config.tools;
                return {
                  ...config,
                  tools: toolsWithoutInteraction,
                  systemPrompt: `${config.systemPrompt}\n\n${buildSubAgentHardRequirementPrompt(locale)}`,
                };
              },
              undefined,
              { executionMode: "blocking" },
            );
          };

          try {
            await runOnce();
            if (!(await hasAnyReportToken(chat.id))) {
              const enforceReportInstruction =
                locale === "zh-CN"
                  ? "继续执行并立刻调用 generateReport 产出 reportToken。不要结束在 interview，输出报告后再给出简要总结。"
                  : "Continue and call generateReport now to produce a reportToken. Do not stop at interview; finish report generation before final summary.";
              await runOnce(enforceReportInstruction);
            }

            const latestAssistantText = await getLatestAssistantText(chat.id);
            subAgentLogger.info({
              msg: "Study sub-agent completed",
              latestAssistantText,
            });
          } catch (error) {
            subAgentLogger.error({
              msg: "Study sub-agent failed in detached run",
              error: (error as Error).message,
            });
          }
        };

        waitUntil(runSubAgent().catch(() => {}));

        const resultSummary =
          locale === "zh-CN"
            ? "研究任务已启动，右侧面板将持续更新执行进度。"
            : "Research task started. The right panel will keep updating progress.";

        return {
          status: "running",
          resultSummary,
          plainText: resultSummary,
          subAgentChatId: subAgentChat.id,
          subAgentChatToken: subAgentChat.token,
          workspaceRunDir: `workspace/study-subagents/${subAgentChat.token}`,
        };
      } catch (error) {
        if (!subAgentChat) {
          throw error;
        }
        const errorMessage = (error as Error).message || "failed to initialize sub-agent";
        logger.error({
          msg: "createStudySubAgent initialization failed after chat created",
          error: errorMessage,
          subAgentChatId: subAgentChat.id,
          subAgentChatToken: subAgentChat.token,
        });
        return {
          status: "failed",
          resultSummary: errorMessage,
          plainText: `Task initialization failed: ${errorMessage}`,
          subAgentChatId: subAgentChat.id,
          subAgentChatToken: subAgentChat.token,
          workspaceRunDir: `workspace/study-subagents/${subAgentChat.token}`,
        };
      }
    },
  });
