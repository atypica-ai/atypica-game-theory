"use server";
import { convertDBMessageToAIMessage, persistentAIMessageToDB } from "@/ai/messageUtils";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import { executeUniversalAgent } from "@/app/(universal)/agent";
import { UniversalToolName } from "@/app/(universal)/tools/types";
import { createUniversalUserChatAction } from "@/app/(universal)/universal/actions";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import type { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getToolName, isToolUIPart } from "ai";
import { getLocale } from "next-intl/server";
import { after } from "next/server";

export interface PersonaPanelWithDetails {
  id: number;
  title: string;
  instruction: string;
  personaIds: number[];
  personas: Pick<
    Persona,
    "id" | "name" | "token" | "tags" | "source" | "prompt" | "extra" | "createdAt"
  >[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: {
    discussions: number;
    interviews: number;
  };
}

export async function fetchUserPersonaPanels(): Promise<
  ServerActionResult<PersonaPanelWithDetails[]>
> {
  return withAuth(async (user) => {
    const panels = await prisma.personaPanel.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        discussionTimelines: { select: { id: true } },
        analystInterviews: { select: { id: true } },
      },
    });

    const allPersonaIds = panels.flatMap((panel) => panel.personaIds);
    const uniquePersonaIds = [...new Set(allPersonaIds)];

    const personas = await prisma.persona.findMany({
      where: { id: { in: uniquePersonaIds } },
      select: {
        id: true,
        name: true,
        token: true,
        tags: true,
        source: true,
        prompt: true,
        extra: true,
        createdAt: true,
      },
    });

    const personaMap = new Map(personas.map((p) => [p.id, p]));

    const panelsWithDetails: PersonaPanelWithDetails[] = panels.map((panel) => ({
      id: panel.id,
      title: panel.title,
      instruction: panel.instruction,
      personaIds: panel.personaIds,
      personas: panel.personaIds.map((id) => personaMap.get(id)).filter((p) => p !== undefined),
      createdAt: panel.createdAt,
      updatedAt: panel.updatedAt,
      usageCount: {
        discussions: panel.discussionTimelines.length,
        interviews: panel.analystInterviews.length,
      },
    }));

    return { success: true, data: panelsWithDetails };
  });
}

export async function deletePersonaPanel(
  panelId: number,
): Promise<ServerActionResult<{ id: number }>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findUnique({
      where: { id: panelId, userId: user.id },
      include: {
        discussionTimelines: { select: { id: true } },
        analystInterviews: { select: { id: true } },
      },
    });

    if (!panel) {
      return {
        success: false,
        code: "not_found",
        message: "PersonaPanel not found or you don't have permission to delete it",
      };
    }

    if (panel.discussionTimelines.length > 0 || panel.analystInterviews.length > 0) {
      return {
        success: false,
        code: "forbidden",
        message: "Cannot delete PersonaPanel that is being used in discussions or interviews",
      };
    }

    await prisma.personaPanel.delete({ where: { id: panelId } });

    return { success: true, data: { id: panelId } };
  });
}

/**
 * Create a new Panel via Universal Agent.
 * Creates a UserChat with the user's description + explicit tool-chaining instruction,
 * auto-executes the Agent, and returns the chat token for navigation.
 *
 * The agent will: searchPersonas → requestSelectPersonas (waits for user) → updatePanel.
 */
export async function createPanelViaAgent(
  description: string,
  options: {
    targetSize?: number;
    tags?: string[];
    mode: "auto" | "manual";
  },
): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    const locale = await getLocale();
    const { targetSize, tags, mode } = options;
    const tagsStr = tags?.length ? tags.join(", ") : "";

    const content =
      mode === "auto"
        ? locale === "zh-CN"
          ? `我想创建一个 Persona Panel。我的需求是：${description}
${targetSize ? `目标人数：${targetSize} 人` : ""}
${tagsStr ? `关键词：${tagsStr}` : ""}

请严格按以下步骤执行，每完成一步立即调用下一个工具，不要输出分析文本：
1. searchPersonas — 根据我的需求搜索合适的人选${targetSize ? `，目标找到约 ${targetSize} 人` : ""}
2. requestSelectPersonas — 将步骤 1 搜索到的 persona ID 列表作为 personaIds 参数传入，让我确认选择
3. 等我选择完成后，调用 updatePanel，用确认的 personaIds 和一个描述性标题保存 Panel

立即开始步骤 1。`
          : `I want to create a Persona Panel. My needs: ${description}
${targetSize ? `Target size: ${targetSize} personas` : ""}
${tagsStr ? `Keywords: ${tagsStr}` : ""}

Execute these steps strictly in order. Call the next tool immediately — do NOT output intermediate text:
1. searchPersonas — search for suitable personas based on my needs${targetSize ? `, target ~${targetSize} personas` : ""}
2. requestSelectPersonas — pass the persona IDs from step 1 as the personaIds parameter
3. After user confirms, call updatePanel with the confirmed personaIds and a descriptive title

Start step 1 now.`
        : // Manual mode — skip search, go straight to persona selector
          locale === "zh-CN"
          ? `我想创建一个 Persona Panel。我的需求是：${description}
${targetSize ? `目标人数：${targetSize} 人` : ""}
${tagsStr ? `关键词：${tagsStr}` : ""}

请严格按以下步骤执行，每完成一步立即调用下一个工具，不要输出分析文本：
1. requestSelectPersonas — 直接打开选择器让我手动选择 Persona（传空 personaIds 数组）
2. 等我选择完成后，调用 updatePanel，用确认的 personaIds 和一个描述性标题保存 Panel

立即开始步骤 1。`
          : `I want to create a Persona Panel. My needs: ${description}
${targetSize ? `Target size: ${targetSize} personas` : ""}
${tagsStr ? `Keywords: ${tagsStr}` : ""}

Execute these steps strictly in order. Call the next tool immediately — do NOT output intermediate text:
1. requestSelectPersonas — open the selector for manual persona selection (pass empty personaIds array)
2. After user confirms, call updatePanel with the confirmed personaIds and a descriptive title

Start step 1 now.`;

    const createResult = await createUniversalUserChatAction({
      role: "user",
      content,
    });
    if (!createResult.success) {
      return { success: false, code: createResult.code, message: createResult.message };
    }

    const logger = rootLogger.child({
      userChatId: createResult.data.id,
      userChatToken: createResult.data.token,
    });
    const { statReport } = initGenericUserChatStatReporter({
      userId: user.id,
      userChatId: createResult.data.id,
      logger,
    });
    await executeUniversalAgent({
      userId: user.id,
      userChat: {
        id: createResult.data.id,
        token: createResult.data.token,
        extra: createResult.data.extra,
      },
      statReport,
      logger,
      locale,
    });

    return { success: true, data: { token: createResult.data.token } };
  });
}

// ---------------------------------------------------------------------------
// Panel Creation Progress (Dialog polling)
// ---------------------------------------------------------------------------

export type PanelCreationProgress = {
  status: "searching" | "selectingPersonas" | "saving" | "completed" | "error";
  toolCallId?: string;
  candidatePersonaIds?: number[];
  panelId?: number;
  panelTitle?: string;
  personaCount?: number;
  errorMessage?: string;
};

/**
 * Poll the creation progress of a panel by reading the UserChat messages.
 * Returns a status based on which tool calls have been made and their states.
 */
export async function fetchPanelCreationProgress(
  chatToken: string,
): Promise<ServerActionResult<PanelCreationProgress>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { token: chatToken, userId: user.id },
      select: {
        id: true,
        extra: true,
        messages: {
          where: { role: "assistant" },
          orderBy: { id: "asc" },
          select: { messageId: true, role: true, parts: true, extra: true },
        },
      },
    });

    if (!userChat) {
      return { success: false, code: "not_found", message: "Chat not found" };
    }

    // No assistant messages yet — still searching
    if (userChat.messages.length === 0) {
      return { success: true, data: { status: "searching" } };
    }

    // Parse all assistant messages for tool calls
    let searchPersonasOutputPersonaIds: number[] = [];
    let requestSelectToolCallId: string | undefined;
    let requestSelectHasOutput = false;
    let updatePanelOutput: Record<string, unknown> | undefined;

    for (const dbMsg of userChat.messages) {
      const msg = convertDBMessageToAIMessage(dbMsg);
      for (const part of msg.parts) {
        if (!isToolUIPart(part)) continue;
        const toolName = getToolName(part);

        if (toolName === UniversalToolName.searchPersonas && part.state === "output-available") {
          const output = part.output as { personas?: Array<{ personaId: number }> } | undefined;
          if (output?.personas) {
            searchPersonasOutputPersonaIds = output.personas.map((p) => p.personaId);
          }
        }

        if (toolName === UniversalToolName.requestSelectPersonas) {
          requestSelectToolCallId = part.toolCallId;
          if (part.state === "output-available") {
            requestSelectHasOutput = true;
          }
        }

        if (toolName === UniversalToolName.updatePanel && part.state === "output-available") {
          updatePanelOutput = part.output as Record<string, unknown> | undefined;
        }
      }
    }

    // Determine status based on tool call progression
    if (updatePanelOutput) {
      return {
        success: true,
        data: {
          status: "completed",
          panelId:
            typeof updatePanelOutput.panelId === "number" ? updatePanelOutput.panelId : undefined,
          panelTitle:
            typeof updatePanelOutput.title === "string" ? updatePanelOutput.title : undefined,
          personaCount:
            typeof updatePanelOutput.personaCount === "number"
              ? updatePanelOutput.personaCount
              : undefined,
        },
      };
    }

    if (requestSelectHasOutput) {
      // User confirmed selection, waiting for updatePanel
      return { success: true, data: { status: "saving" } };
    }

    if (requestSelectToolCallId) {
      // requestSelectPersonas is pending user input
      return {
        success: true,
        data: {
          status: "selectingPersonas",
          toolCallId: requestSelectToolCallId,
          candidatePersonaIds: searchPersonasOutputPersonaIds,
        },
      };
    }

    // Check for errors (no runId and no progress)
    const hasError =
      typeof userChat.extra?.error === "string" && userChat.extra.error !== "";
    if (hasError) {
      return {
        success: true,
        data: { status: "error", errorMessage: userChat.extra?.error ?? "Unknown error" },
      };
    }

    // Still searching
    return { success: true, data: { status: "searching" } };
  });
}

/**
 * Submit a tool result for panel creation (human-in-the-loop).
 * Persists the tool output to DB and re-executes the agent.
 */
export async function submitPanelCreationToolResult(
  chatToken: string,
  toolCallId: string,
  toolName: string,
  output: Record<string, unknown>,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { token: chatToken, userId: user.id },
      select: { id: true, token: true, extra: true },
    });

    if (!userChat) {
      return { success: false, code: "not_found", message: "Chat not found" };
    }

    // Find the last assistant message to append tool result
    const lastAssistantMessage = await prisma.chatMessage.findFirst({
      where: { userChatId: userChat.id, role: "assistant" },
      orderBy: { id: "desc" },
      select: { messageId: true },
    });

    if (!lastAssistantMessage) {
      return { success: false, code: "not_found", message: "No assistant message found" };
    }

    // Persist tool result
    await persistentAIMessageToDB({
      mode: "append",
      userChatId: userChat.id,
      message: {
        id: lastAssistantMessage.messageId,
        role: "assistant",
        parts: [
          {
            type: `tool-${toolName}` as `tool-${string}`,
            toolCallId,
            state: "output-available",
            input: {},
            output,
          },
        ],
      },
    });

    // Re-execute the agent in the background
    const locale = await getLocale();
    const logger = rootLogger.child({ userChatId: userChat.id, userChatToken: userChat.token });
    const { statReport } = initGenericUserChatStatReporter({
      userId: user.id,
      userChatId: userChat.id,
      logger,
    });

    after(
      executeUniversalAgent({
        userId: user.id,
        userChat,
        statReport,
        logger,
        locale,
      })
        .then(() => logger.info("panel creation agent re-execution completed"))
        .catch((error) =>
          logger.error({
            msg: "panel creation agent re-execution error",
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
    );

    return { success: true, data: undefined };
  });
}
