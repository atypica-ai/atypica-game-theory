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
import { createUniversalSubAgentConfig } from "./config";
import { getSubAgentModePrompt } from "./prompt";
import {
  createSubAgentInputSchema,
  createSubAgentOutputSchema,
  type CreateSubAgentToolResult,
} from "./types";

const ENABLE_SKILL_DRIVEN_SUBAGENT = process.env.UNIVERSAL_SUBAGENT_MODE !== "legacy";

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

async function appendForcedInstruction({
  userChatId,
  forcedInstruction,
}: {
  userChatId: number;
  forcedInstruction?: string;
}) {
  if (!forcedInstruction) return;

  await persistentAIMessageToDB({
    mode: "append",
    userChatId,
    message: {
      id: generateId(),
      role: "user",
      parts: [{ type: "text", text: forcedInstruction }],
    },
  });
}

async function executeLegacyStudySubAgent({
  userId,
  teamId,
  locale,
  logger,
  statReport,
  userChatId,
  userChatToken,
  mode,
  forcedInstruction,
}: {
  userId: number;
  teamId: number | null;
  locale: AgentToolConfigArgs["locale"];
  logger: AgentToolConfigArgs["logger"];
  statReport: ReturnType<typeof initStudyStatReporter>["statReport"];
  userChatId: number;
  userChatToken: string;
  mode: Parameters<typeof getSubAgentModePrompt>[0]["mode"];
  forcedInstruction?: string;
}) {
  await appendForcedInstruction({ userChatId, forcedInstruction });

  await executeBaseAgentRequest(
    {
      userId,
      teamId,
      studyUserChatId: userChatId,
      userChatContext: {
        defaultLocale: locale,
      },
      locale,
      logger,
      statReport,
    },
    async (toolAbortSignal) => {
      const config = await createStudyAgentConfig({
        userId,
        studyUserChatId: userChatId,
        userChatContext: {
          defaultLocale: locale,
        },
        locale,
        logger,
        statReport,
        toolAbortSignal,
      });

      const toolsWithoutInteraction = Object.fromEntries(
        Object.entries(config.tools).filter(
          ([toolName]) => toolName !== StudyToolName.requestInteraction,
        ),
      ) as typeof config.tools;

      const sessionDir = `${SANDBOX_SESSIONS_DIR}/${userChatToken}`;
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

      const systemPrompt = [
        config.systemPrompt,
        getSubAgentModePrompt({ mode, locale }),
        sandboxSystemPrompt({ locale, sessionDir }),
      ].join("\n\n");

      return {
        ...config,
        tools,
        systemPrompt,
      } as AgentRequestConfig<typeof tools>;
    },
    undefined,
    { executionMode: "blocking" },
  );
}

async function executeSkillDrivenSubAgent({
  userId,
  teamId,
  locale,
  logger,
  statReport,
  userChatId,
  userChatToken,
  mode,
  forcedInstruction,
}: {
  userId: number;
  teamId: number | null;
  locale: AgentToolConfigArgs["locale"];
  logger: AgentToolConfigArgs["logger"];
  statReport: ReturnType<typeof initStudyStatReporter>["statReport"];
  userChatId: number;
  userChatToken: string;
  mode: Parameters<typeof getSubAgentModePrompt>[0]["mode"];
  forcedInstruction?: string;
}) {
  await appendForcedInstruction({ userChatId, forcedInstruction });

  await executeBaseAgentRequest(
    {
      userId,
      teamId,
      studyUserChatId: userChatId,
      userChatContext: {
        defaultLocale: locale,
      },
      locale,
      logger,
      statReport,
    },
    async (toolAbortSignal) =>
      createUniversalSubAgentConfig({
        userId,
        subAgentChatId: userChatId,
        subAgentChatToken: userChatToken,
        locale,
        logger,
        statReport,
        toolAbortSignal,
        mode,
      }),
    undefined,
    { executionMode: "blocking" },
  );
}

export const createSubAgentTool = ({
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
    inputSchema: createSubAgentInputSchema,
    outputSchema: createSubAgentOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => ({
      type: "text",
      value: result.plainText,
    }),
    execute: async ({
      taskRequirement,
      outputFormat,
      mode,
      subAgentTitle,
    }): Promise<CreateSubAgentToolResult> => {
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
          tool: "createSubAgent",
          subAgentChatId: subAgentChat.id,
          subAgentChatToken: subAgentChat.token,
          subAgentExecutor: ENABLE_SKILL_DRIVEN_SUBAGENT ? "skill-driven" : "legacy",
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
          const runSequence = async (runner: (forcedInstruction?: string) => Promise<void>) => {
            await runner();
            if (mode !== "flexible" && !(await hasAnyReportToken(chat.id))) {
              const enforceReportInstruction =
                locale === "zh-CN"
                  ? "如果当前任务需要可复用交付物，请继续执行并立刻调用 generateReport 产出 reportToken。不要只停留在访谈或讨论，完成报告后再做简要总结。"
                  : "If this task needs a reusable deliverable, continue and call generateReport now to produce a reportToken. Do not stop at interviews or discussion only; finish the report before the final summary.";
              await runner(enforceReportInstruction);
            }
          };

          const runLegacySequence = () =>
            runSequence((forcedInstruction) =>
              executeLegacyStudySubAgent({
                userId,
                teamId,
                locale,
                logger: subAgentLogger,
                statReport,
                userChatId: chat.id,
                userChatToken: chat.token,
                mode,
                forcedInstruction,
              }),
            );

          try {
            if (ENABLE_SKILL_DRIVEN_SUBAGENT) {
              await runSequence((forcedInstruction) =>
                executeSkillDrivenSubAgent({
                  userId,
                  teamId,
                  locale,
                  logger: subAgentLogger,
                  statReport,
                  userChatId: chat.id,
                  userChatToken: chat.token,
                  mode,
                  forcedInstruction,
                }),
              );
            } else {
              await runLegacySequence();
            }

            const latestAssistantText = await getLatestAssistantText(chat.id);
            subAgentLogger.info({
              msg: "Study sub-agent completed",
              latestAssistantText,
            });
          } catch (error) {
            if (ENABLE_SKILL_DRIVEN_SUBAGENT) {
              subAgentLogger.warn({
                msg: "Skill-driven sub-agent failed, falling back to legacy executor",
                error: (error as Error).message,
              });

              try {
                await runLegacySequence();
                const latestAssistantText = await getLatestAssistantText(chat.id);
                subAgentLogger.info({
                  msg: "Legacy fallback sub-agent completed",
                  latestAssistantText,
                });
                return;
              } catch (legacyError) {
                subAgentLogger.error({
                  msg: "Legacy fallback sub-agent also failed",
                  error: (legacyError as Error).message,
                });
              }
            } else {
              subAgentLogger.error({
                msg: "Study sub-agent failed in detached run",
                error: (error as Error).message,
              });
            }
          }
        };

        waitUntil(runSubAgent().catch(() => {}));

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
          msg: "createSubAgent initialization failed after chat created",
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
