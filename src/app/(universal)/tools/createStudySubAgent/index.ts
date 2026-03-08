import "server-only";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { initStudyStatReporter } from "@/ai/tools/stats";
import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import {
  AgentRequestConfig,
  executeBaseAgentRequest,
} from "@/app/(study)/agents/baseAgentRequest";
import { createStudyAgentConfig } from "@/app/(study)/agents/configs/studyAgentConfig";
import { UserChatContext } from "@/app/(study)/context/types";
import { StudyToolName } from "@/app/(study)/tools/types";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { prisma } from "@/prisma/prisma";
import { createAgentSandbox, SANDBOX_SESSIONS_DIR, sandboxSystemPrompt } from "@/sandbox";
import { waitUntil } from "@vercel/functions";
import { generateId, tool } from "ai";
import { getSubAgentModePrompt } from "./prompt";
import {
  createStudySubAgentInputSchema,
  createStudySubAgentOutputSchema,
  type CreateStudySubAgentToolResult,
} from "./types";

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
      mode,
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

                // Remove requestInteraction — sub-agent runs autonomously
                const toolsWithoutInteraction = Object.fromEntries(
                  Object.entries(config.tools).filter(
                    ([toolName]) => toolName !== StudyToolName.requestInteraction,
                  ),
                ) as typeof config.tools;

                // Inject bash/readFile/writeFile from sandbox so sub-agent can read/write workspace
                const sessionDir = `${SANDBOX_SESSIONS_DIR}/${chat.token}`;
                const { tools: bashTools } = await createAgentSandbox({
                  userId,
                  skills: [],
                  sessionDir,
                });
                const tools = {
                  ...toolsWithoutInteraction,
                  bash: bashTools.bash,
                  readFile: bashTools.readFile,
                  writeFile: bashTools.writeFile,
                };

                const modePrompt = getSubAgentModePrompt({ mode, locale });
                const sandboxPrompt = sandboxSystemPrompt({ locale, sessionDir });

                const systemPrompt = [
                  config.systemPrompt, // study 基础提示词
                  modePrompt, // 模式执行要求（study/flexible/panel）
                  sandboxPrompt, // 文件系统说明（目录结构、CWD、命令限制）
                ].join("\n\n");

                // Type assertion: study config's specialHandlers are typed against
                // the narrower study TOOLS, but they only reference study tool names
                // and work correctly with the extended tools set.
                return {
                  ...config,
                  tools,
                  systemPrompt,
                } as AgentRequestConfig<typeof tools>;
              },
              undefined,
              { executionMode: "blocking" },
            );
          };

          try {
            await runOnce();
            // In flexible mode, report is optional — don't force it
            if (mode !== "flexible" && !(await hasAnyReportToken(chat.id))) {
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

        // TODO: lead agent 目前无法知道 sub-agent 何时完成，需要增加完成通知机制
        const sessionPath = `${SANDBOX_SESSIONS_DIR}/${subAgentChat.token}`;
        const resultSummary =
          locale === "zh-CN"
            ? `研究任务已启动，右侧面板将持续更新执行进度。Sub-agent 工作目录：${sessionPath}/`
            : `Research task started. The right panel will keep updating progress. Sub-agent workspace: ${sessionPath}/`;

        return {
          status: "running",
          resultSummary,
          plainText: resultSummary,
          subAgentChatId: subAgentChat.id,
          subAgentChatToken: subAgentChat.token,
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
        };
      }
    },
  });
