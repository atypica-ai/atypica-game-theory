"use server";

import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import { mergeUserChatContext } from "@/app/(study)/context/utils";
import { executeUniversalAgent } from "@/app/(universal)/agent";
import { createUniversalUserChat } from "@/app/(universal)/universal/actions";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { getLocale } from "next-intl/server";

/**
 * Create a new research project via Universal Agent.
 * Agent will: generate plan → confirmPanelResearchPlan → execute discussion/interview → generateReport
 */
export async function createUniversalAgentFromPanel(
  panelId: number,
  researchType: "focusGroup" | "userInterview" | "expertInterview",
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
2. 调用 confirmPanelResearchPlan 工具，展示对话计划给用户确认
3. 用户确认后，根据研究类型调用对应工具：
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
2. Call confirmPanelResearchPlan tool to show the conversation plan for user confirmation
3. After user confirms, call the corresponding tool based on research type:
   - Focus Group: discussionChat (personaIds: [${personas.map((p) => p.id).join(", ")}])
   - User Interview: interviewChat (personas: [${personas.map((p) => `{id: ${p.id}, name: "${p.name}"}`).join(", ")}])
   - Expert Interview: interviewChat (expert mode, same as above)
4. After execution, call generateReport to generate research report

Start step 1 immediately.`;

    const createResult = await createUniversalUserChat({
      role: "user",
      content: instruction,
    });

    if (!createResult.success) {
      return { success: false, code: createResult.code, message: createResult.message };
    }

    const defaultLocale = await detectInputLanguage({
      text: question,
      fallbackLocale: locale,
    });

    // Attach panelId and locale to UserChat context so project detail page can verify ownership
    await mergeUserChatContext({
      id: createResult.data.id,
      context: { personaPanelId: panelId, defaultLocale },
    });

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
      userChat: createResult.data,
      statReport,
      logger,
      locale,
    });

    return { success: true, data: { token: createResult.data.token } };
  });
}
