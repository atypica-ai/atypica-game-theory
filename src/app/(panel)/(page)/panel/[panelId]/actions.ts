"use server";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { mergeUserChatContext } from "@/app/(study)/context/utils";
import { StudyToolName } from "@/app/(study)/tools/types";
import { createUniversalUserChat } from "@/app/(universal)/lib";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import type { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getToolName, isToolUIPart } from "ai";
import { getLocale } from "next-intl/server";

export interface PersonaPanelWithDetails {
  id: number;
  title: string;
  instruction: string;
  personaIds: number[];
  personas: Pick<
    Persona,
    "id" | "name" | "token" | "tags" | "source" | "prompt" | "extra" | "tier" | "createdAt"
  >[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: {
    discussions: number;
    interviews: number;
  };
}

export async function fetchPersonaPanelById(
  panelId: number,
): Promise<ServerActionResult<PersonaPanelWithDetails>> {
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
        message: "PersonaPanel not found or you don't have permission to view it",
      };
    }

    const personas = await prisma.persona.findMany({
      where: { id: { in: panel.personaIds } },
      select: {
        id: true,
        name: true,
        token: true,
        tags: true,
        source: true,
        prompt: true,
        extra: true,
        tier: true,
        createdAt: true,
      },
    });

    const personaMap = new Map(personas.map((p) => [p.id, p]));

    return {
      success: true,
      data: {
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
      },
    };
  });
}

export async function updatePanelPersonas(
  panelId: number,
  personaIds: number[],
): Promise<ServerActionResult<{ personaIds: number[] }>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findUnique({
      where: { id: panelId, userId: user.id },
      select: { id: true },
    });

    if (!panel) {
      return {
        success: false,
        code: "not_found",
        message: "PersonaPanel not found or you don't have permission to update it",
      };
    }

    const updated = await prisma.personaPanel.update({
      where: { id: panelId, userId: user.id },
      data: { personaIds },
    });

    return { success: true, data: { personaIds: updated.personaIds } };
  });
}

export type ResearchType = "focusGroup" | "userInterview" | "expertInterview";

/**
 * Create a new research project via Universal Agent.
 * Agent will: generate plan → confirmPanelResearchPlan → execute discussion/interview → generateReport
 */
export async function createUniversalAgentFromPanel(
  panelId: number,
  researchType: ResearchType,
  question: string,
  personas: Array<{ id: number; name: string }>,
): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    // Verify panel ownership
    const panel = await prisma.personaPanel.findUnique({
      where: { id: panelId, userId: user.id },
      select: { id: true },
    });
    if (!panel) {
      return { success: false, code: "not_found" as const, message: "PersonaPanel not found" };
    }

    const locale = await getLocale();

    // Format persona list for agent context
    const personaList = personas.map((p) => `- ${p.name} (id: ${p.id})`).join("\n");

    // Build instruction for Agent
    const instruction =
      locale === "zh-CN"
        ? `我想基于 Panel (panelId: ${panelId}) 创建一个研究项目。

研究类型：${researchType === "focusGroup" ? "焦点小组讨论" : researchType === "userInterview" ? "用户访谈" : "专家访谈"}
研究问题：${question}

Panel 中的 Personas（共 ${personas.length} 人）：
${personaList}

请按以下步骤执行：
1. 根据研究问题，制定一个对话计划：你打算跟这些用户聊什么话题、问什么问题、怎么引导讨论
   注意：计划内容只需要包含对话策略（话题、问题、讨论流程），不要提及时间预估、准备步骤、报告生成等技术步骤
2. 调用 confirmPanelResearchPlan 工具，展示对话计划给用户确认。用户可能修改研究问题或执行大纲；一旦用户提交确认，以该工具**最终输出**为准，后续步骤不得再按你未修改前的草案执行。
3. 用户确认后，根据研究类型调用对应工具。调用 discussionChat / interviewChat 时，必须把确认后的研究问题与执行计划作为 instruction 的核心依据（仅可做小幅格式整理），紧贴用户确认的 brief：
   - 焦点小组: discussionChat (personaIds: [${personas.map((p) => p.id).join(", ")}])
   - 用户访谈: interviewChat (personas: [${personas.map((p) => `{id: ${p.id}, name: "${p.name}"}`).join(", ")}])
   - 专家访谈: interviewChat (专家模式，同上)
4. 执行完成后，调用 generateReport 生成研究报告

立即开始步骤 1。`
        : `I want to create a research project based on Panel (panelId: ${panelId}).

Research Type: ${researchType === "focusGroup" ? "Focus Group" : researchType === "userInterview" ? "User Interview" : "Expert Interview"}
Research Question: ${question}

Personas in the Panel (${personas.length} total):
${personaList}

Please follow these steps:
1. Based on the research question, create a conversation plan: what topics to explore with the personas, what questions to ask, and how to guide the discussion
   Note: the plan should ONLY cover conversation strategy (topics, questions, discussion flow). Do NOT mention time estimates, preparation steps, or report generation.
2. Call confirmPanelResearchPlan to show the plan for user confirmation. The user may edit the question or execution outline; once they submit, the tool **final output** is authoritative—do not follow your pre-confirmation draft afterward.
3. After confirmation, call the corresponding tool. For discussionChat / interviewChat, the "instruction" must be grounded in the confirmed question and execution plan (minor formatting only; stay faithful to the user-confirmed brief):
   - Focus Group: discussionChat (personaIds: [${personas.map((p) => p.id).join(", ")}])
   - User Interview: interviewChat (personas: [${personas.map((p) => `{id: ${p.id}, name: "${p.name}"}`).join(", ")}])
   - Expert Interview: interviewChat (expert mode, same as above)
4. After execution, call generateReport to generate research report

Start step 1 immediately.`;

    const createResult = await createUniversalUserChat({
      userId: user.id,
      role: "user",
      content: instruction,
    });

    const defaultLocale = await detectInputLanguage({
      text: question,
      fallbackLocale: locale,
    });

    // Attach panelId and locale to UserChat context so project detail page can verify ownership
    await mergeUserChatContext({
      id: createResult.id,
      context: { personaPanelId: panelId, defaultLocale },
    });

    // Agent execution is now triggered by the frontend via useChat.regenerate()
    // with executionMode:"sync" for the plan phase, then switches to background
    // after user confirms the plan.
    //
    // Previously the agent was executed server-side here:
    // const logger = rootLogger.child({ userChatId: createResult.id, userChatToken: createResult.token });
    // const { statReport } = initGenericUserChatStatReporter({ userId: user.id, userChatId: createResult.id, logger });
    // await executeUniversalAgent({ userId: user.id, userChat: createResult, statReport, logger, locale });

    return { success: true, data: { token: createResult.token } };
  });
}

export async function deleteResearchProject(
  projectToken: string,
): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: {
        token: projectToken,
        userId: user.id,
        kind: "universal", // 这里强制加一个 universal 没事，因为其实现在可以删除的就是创建 panel 的那个 userChat
      },
      select: {
        id: true,
        token: true,
        messages: {
          where: { role: "assistant" },
          select: { messageId: true, role: true, parts: true, extra: true },
        },
      },
    });

    if (!userChat) {
      return { success: false, code: "not_found", message: "Project not found" };
    }

    // Check if project has any content
    let hasContent = false;
    for (const dbMessage of userChat.messages) {
      const message = convertDBMessageToAIMessage(dbMessage);
      for (const part of message.parts) {
        if (!isToolUIPart(part)) continue;
        const toolName = getToolName(part);

        // Cannot delete if has artifacts, interviews, or discussions
        if (
          (toolName === StudyToolName.generateReport ||
            toolName === StudyToolName.generatePodcast) &&
          part.state === "output-available"
        ) {
          hasContent = true;
          break;
        }
        if (toolName === StudyToolName.interviewChat || toolName === StudyToolName.discussionChat) {
          hasContent = true;
          break;
        }
      }
      if (hasContent) break;
    }

    if (hasContent) {
      return {
        success: false,
        code: "forbidden",
        message: "Cannot delete project with existing content",
      };
    }

    // No content, safe to delete (messages/statistics cascade automatically)
    await prisma.userChat.delete({ where: { id: userChat.id } });

    return { success: true, data: { token: projectToken } };
  });
}
