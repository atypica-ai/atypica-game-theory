"use server";
import { convertDBMessageToAIMessage, persistentAIMessageToDB } from "@/ai/messageUtils";
import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import {
  type ConfirmPanelResearchPlanInput,
  type ConfirmPanelResearchPlanOutput,
} from "@/app/(panel)/tools/confirmPanelResearchPlan/types";
import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import { UserChatContext } from "@/app/(study)/context/types";
import { executeUniversalAgent } from "@/app/(universal)/agent";
import { UniversalToolName } from "@/app/(universal)/tools/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import type { PersonaExtra, UserChatExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { type UIMessage } from "ai";
import { getLocale } from "next-intl/server";
import { after } from "next/server";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface PanelDiscussionDetail {
  timeline: {
    token: string;
    events: DiscussionTimelineEvent[];
    summary: string;
    minutes: string;
  };
  personas: { id: number; name: string; extra: PersonaExtra }[];
}

export interface BatchInterviewsDetail {
  personas: { id: number; name: string; extra: PersonaExtra }[];
  interviews: {
    personaId: number;
    personaName: string;
    status: "completed" | "in-progress" | "pending";
    conclusion: string;
    interviewUserChatToken: string | null;
  }[];
}

export interface PendingConfirmPlan {
  toolCallId: string;
  input: ConfirmPanelResearchPlanInput;
}

// ─────────────────────────────────────────────────────────────
// fetchProjectContextByToken — panel/project basic info
// ─────────────────────────────────────────────────────────────

export async function fetchProjectContextByToken(userChatToken: string): Promise<
  ServerActionResult<{
    panelId: number;
    panelTitle: string;
    project: {
      token: string;
      title: string;
      kind: string;
      extra: UserChatExtra;
      context: UserChatContext;
      createdAt: Date;
    };
  }>
> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { token: userChatToken, userId: user.id },
      select: {
        token: true,
        title: true,
        kind: true,
        extra: true,
        context: true,
        createdAt: true,
      },
    });

    if (!userChat) {
      return { success: false, code: "not_found", message: "Project not found" };
    }

    const context = userChat.context;
    const panelId = context.personaPanelId;
    if (typeof panelId !== "number") {
      return { success: false, code: "forbidden", message: "Project is not attached to a panel" };
    }

    const panel = await prisma.personaPanel.findUnique({
      where: { id: panelId, userId: user.id },
      select: { id: true, title: true },
    });

    if (!panel) {
      return { success: false, code: "forbidden", message: "Panel not found" };
    }

    return {
      success: true,
      data: {
        panelId: panel.id,
        panelTitle: panel.title,
        project: {
          token: userChat.token,
          title: userChat.title,
          kind: userChat.kind,
          extra: userChat.extra,
          context,
          createdAt: userChat.createdAt,
        },
      },
    };
  });
}

// ─────────────────────────────────────────────────────────────
// fetchProjectMessages — poll project messages for tool call extraction
// ─────────────────────────────────────────────────────────────

export async function fetchProjectMessages(
  userChatToken: string,
): Promise<ServerActionResult<UIMessage[]>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { token: userChatToken, userId: user.id },
      select: {
        messages: {
          orderBy: { id: "asc" },
        },
      },
    });

    if (!userChat) {
      return { success: false, code: "not_found", message: "Project not found" };
    }

    const messages: UIMessage[] = userChat.messages.map(convertDBMessageToAIMessage);
    return { success: true, data: messages };
  });
}

// ─────────────────────────────────────────────────────────────
// fetchDiscussionDetail — timeline + personas for a discussion
// ─────────────────────────────────────────────────────────────

export async function fetchDiscussionDetail(
  timelineToken: string,
): Promise<ServerActionResult<PanelDiscussionDetail>> {
  return withAuth(async (user) => {
    const timeline = await prisma.discussionTimeline.findUnique({
      where: { token: timelineToken },
      select: {
        token: true,
        events: true,
        summary: true,
        minutes: true,
        personaPanel: { select: { userId: true, personaIds: true } },
      },
    });
    if (!timeline || timeline.personaPanel.userId !== user.id) {
      return { success: false, code: "not_found", message: "Discussion not found" };
    }

    const panelPersonaIds = Array.isArray(timeline.personaPanel.personaIds)
      ? timeline.personaPanel.personaIds.filter((id): id is number => typeof id === "number")
      : [];

    const personas = await prisma.persona.findMany({
      where: { id: { in: panelPersonaIds } },
      select: { id: true, name: true, extra: true },
    });

    return {
      success: true,
      data: {
        timeline: {
          token: timeline.token,
          events: timeline.events ?? [],
          summary: timeline.summary,
          minutes: timeline.minutes,
        },
        personas,
      },
    };
  });
}

// ─────────────────────────────────────────────────────────────
// fetchBatchInterviewsDetail — personas + interview status for a set of persona IDs
// ─────────────────────────────────────────────────────────────

// 一个 Project 内，同一 Panel 下每个 Persona 理论上只被访谈一次。
// interviewChat tool 通过 findFirst({ personaPanelId, personaId }) 做应用层去重，
// 但没有数据库唯一约束，异常情况下可能产生重复 AnalystInterview 记录。
// 此时按 personaId 去重只能取到其中一条，
// 因为 tool call output 未记录 AnalystInterview.id，无法将特定 tool call 映射到特定记录。

export async function fetchBatchInterviewsDetail({
  panelId,
  personaIds,
}: {
  panelId: number;
  personaIds: number[];
}): Promise<ServerActionResult<BatchInterviewsDetail>> {
  return withAuth(async (user) => {
    // Verify panel ownership
    const panel = await prisma.personaPanel.findUnique({
      where: { id: panelId, userId: user.id },
      select: { id: true, personaIds: true },
    });
    if (!panel) {
      return { success: false, code: "not_found", message: "Panel not found" };
    }

    // Fetch personas
    const personas = await prisma.persona.findMany({
      where: { id: { in: personaIds } },
      select: { id: true, name: true, extra: true },
    });
    const personaNameMap = new Map(personas.map((p) => [p.id, p.name]));

    // Fetch interviews for these personas in this panel
    const interviewRows = await prisma.analystInterview.findMany({
      where: {
        personaPanelId: panelId,
        personaId: { in: personaIds },
      },
      include: {
        interviewUserChat: {
          select: {
            token: true,
            extra: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Dedupe by personaId — keep the latest
    const interviewByPersonaId = new Map<number, (typeof interviewRows)[number]>();
    for (const row of interviewRows) {
      if (typeof row.personaId !== "number") continue;
      if (!interviewByPersonaId.has(row.personaId)) {
        interviewByPersonaId.set(row.personaId, row);
      }
    }

    // Build interview list for all requested personas
    const interviews = personaIds.map((personaId) => {
      const row = interviewByPersonaId.get(personaId);
      const personaName = personaNameMap.get(personaId) ?? `Persona #${personaId}`;

      if (!row) {
        return {
          personaId,
          personaName,
          status: "pending" as const,
          conclusion: "",
          interviewUserChatToken: null,
        };
      }

      const interviewRunning = !!row.interviewUserChat?.extra?.runId;
      const status: "completed" | "in-progress" | "pending" =
        row.conclusion !== "" ? "completed" : interviewRunning ? "in-progress" : "pending";

      return {
        personaId,
        personaName,
        status,
        conclusion: row.conclusion,
        interviewUserChatToken: row.interviewUserChat?.token ?? null,
      };
    });

    return {
      success: true,
      data: { personas, interviews },
    };
  });
}

// ─────────────────────────────────────────────────────────────
// fetchInterviewMessages — messages for a single interview
// ─────────────────────────────────────────────────────────────

export async function fetchInterviewMessages({
  interviewUserChatToken,
}: {
  interviewUserChatToken: string;
}): Promise<ServerActionResult<UIMessage[]>> {
  return withAuth(async (user) => {
    const interviewUserChat = await prisma.userChat.findUnique({
      where: { token: interviewUserChatToken, userId: user.id },
      select: {
        messages: { orderBy: { id: "asc" } },
      },
    });
    if (!interviewUserChat) {
      return { success: false, code: "not_found", message: "Interview not found" };
    }

    const messages: UIMessage[] = interviewUserChat.messages.map(convertDBMessageToAIMessage);
    return { success: true, data: messages };
  });
}

// ─────────────────────────────────────────────────────────────
// submitResearchConfirmation — confirm plan + re-execute agent
// ─────────────────────────────────────────────────────────────

export async function submitResearchConfirmation(
  userChatToken: string,
  toolCallId: string,
  output: ConfirmPanelResearchPlanOutput,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: { token: userChatToken, userId: user.id },
      select: { id: true, token: true, extra: true },
    });

    if (!userChat) {
      return { success: false, code: "not_found", message: "Chat not found" };
    }

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
            type: `tool-${UniversalToolName.confirmPanelResearchPlan}` as `tool-${string}`,
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
        .then(() => logger.info("research plan confirmed, agent re-execution completed"))
        .catch((error) =>
          logger.error({
            msg: "research plan confirmed, agent re-execution error",
            error: error instanceof Error ? error.message : String(error),
          }),
        ),
    );

    return { success: true, data: undefined };
  });
}
