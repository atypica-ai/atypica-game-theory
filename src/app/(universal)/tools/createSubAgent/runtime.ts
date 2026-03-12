import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { AgentToolConfigArgs } from "@/ai/tools/types";
import { UserChatContext } from "@/app/(study)/context/types";
import { truncateForTitle } from "@/lib/textUtils";
import { createUserChat } from "@/lib/userChat/lib";
import { prisma } from "@/prisma/prisma";
import { SANDBOX_SESSIONS_DIR } from "@/sandbox";
import { generateId } from "ai";
import { type Logger } from "pino";
import { type SubAgentMode } from "./prompt";

export type SubAgentExecutionContext = {
  userId: number;
  teamId: number | null;
  locale: AgentToolConfigArgs["locale"];
  logger: AgentToolConfigArgs["logger"];
  statReport: AgentToolConfigArgs["statReport"];
  userChatId: number;
  userChatToken: string;
  mode: SubAgentMode;
};

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

export async function getLatestAssistantText(userChatId: number): Promise<string> {
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

export async function hasAnyReportToken(userChatId: number): Promise<boolean> {
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

export async function appendForcedInstruction({
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

export async function createSubAgentChat({
  userId,
  locale,
  taskRequirement,
  subAgentTitle,
}: {
  userId: number;
  locale: AgentToolConfigArgs["locale"];
  taskRequirement: string;
  subAgentTitle?: string;
}) {
  const title = truncateForTitle(subAgentTitle || taskRequirement, {
    maxDisplayWidth: 100,
    suffix: "...",
  });

  return createUserChat({
    userId,
    kind: "study",
    title,
    context: {
      defaultLocale: locale,
    } satisfies UserChatContext,
  });
}

export async function appendInitialTaskMessage({
  userChatId,
  taskRequirement,
  outputFormat,
}: {
  userChatId: number;
  taskRequirement: string;
  outputFormat: string;
}) {
  await persistentAIMessageToDB({
    mode: "append",
    userChatId,
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
}

export function createSubAgentLogger({
  logger,
  subAgentChatId,
  subAgentChatToken,
}: {
  logger: Logger;
  subAgentChatId: number;
  subAgentChatToken: string;
}) {
  return logger.child({
    tool: "createSubAgent",
    subAgentChatId,
    subAgentChatToken,
    subAgentExecutor: "skill-driven",
  });
}

export function buildReportEnforcementInstruction({
  locale,
}: {
  locale: AgentToolConfigArgs["locale"];
}) {
  return locale === "zh-CN"
    ? "如果当前任务需要可复用交付物，请继续执行并立刻调用 generateReport 产出 reportToken。不要只停留在访谈或讨论，完成报告后再做简要总结。"
    : "If this task needs a reusable deliverable, continue and call generateReport now to produce a reportToken. Do not stop at interviews or discussion only; finish the report before the final summary.";
}

export function buildSubAgentStartSummary({
  locale,
  userChatToken,
}: {
  locale: AgentToolConfigArgs["locale"];
  userChatToken: string;
}) {
  const sessionPath = `${SANDBOX_SESSIONS_DIR}/${userChatToken}`;
  return locale === "zh-CN"
    ? `研究任务已启动，右侧面板将持续更新执行进度。Sub-agent 工作目录：${sessionPath}/`
    : `Research task started. The right panel will keep updating progress. Sub-agent workspace: ${sessionPath}/`;
}
