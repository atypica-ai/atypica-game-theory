"use server";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import { UserChatContext } from "@/app/(study)/context/types";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import type { Persona, PersonaExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import type { UIMessage } from "ai";

export { fetchDiscussionTimeline } from "../actions";

export interface DiscussionSummary {
  token: string;
  instruction: string;
  summary: string;
  eventCount: number;
  participantIds: number[];
  createdAt: Date;
  isComplete: boolean;
}

export interface PanelDiscussionDetail {
  timeline: {
    token: string;
    instruction: string;
    events: DiscussionTimelineEvent[];
    summary: string;
    minutes: string;
    createdAt: Date;
  };
  personas: Pick<Persona, "id" | "name" | "token" | "tags" | "extra">[];
}

export interface PanelInterview {
  id: number;
  personaId: number;
  personaName: string;
  personaToken: string;
  personaExtra: PersonaExtra;
  status: "completed" | "in-progress" | "pending";
  conclusion: string;
  messageCount: number;
  interviewUserChat: {
    token: string;
    backgroundToken: string | null;
  } | null;
  createdAt: Date;
}

export async function fetchProjectContextByToken(userChatToken: string): Promise<
  ServerActionResult<{
    panelId: number;
    panelTitle: string;
    project: {
      token: string;
      title: string;
      kind: string;
      backgroundToken: string | null;
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
        backgroundToken: true,
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
          backgroundToken: userChat.backgroundToken,
          context,
          createdAt: userChat.createdAt,
        },
      },
    };
  });
}

export async function fetchDiscussionsByPanelId(
  panelId: number,
): Promise<ServerActionResult<DiscussionSummary[]>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findUnique({
      where: { id: panelId, userId: user.id },
      select: { id: true },
    });
    if (!panel) {
      return { success: false, code: "forbidden", message: "Panel not found" };
    }

    const timelines = await prisma.discussionTimeline.findMany({
      where: { personaPanelId: panelId },
      orderBy: { createdAt: "desc" },
    });

    const discussions: DiscussionSummary[] = timelines.map((t) => {
      const events = t.events ?? [];
      const participantIds = [
        ...new Set(
          events
            .filter(
              (e): e is DiscussionTimelineEvent & { type: "persona-reply" } =>
                e.type === "persona-reply",
            )
            .map((e) => e.personaId),
        ),
      ];
      return {
        token: t.token,
        instruction: t.instruction,
        summary: t.summary,
        eventCount: events.length,
        participantIds,
        createdAt: t.createdAt,
        isComplete: t.summary !== "",
      };
    });

    return { success: true, data: discussions };
  });
}

export async function fetchDiscussionDetail(
  panelId: number,
  timelineToken: string,
): Promise<ServerActionResult<PanelDiscussionDetail>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findUnique({ where: { id: panelId, userId: user.id } });
    if (!panel) {
      return { success: false, code: "forbidden", message: "Panel not found" };
    }

    const timeline = await prisma.discussionTimeline.findUnique({
      where: { token: timelineToken, personaPanelId: panelId },
    });
    if (!timeline) {
      return { success: false, code: "not_found", message: "Discussion not found" };
    }

    const personas = await prisma.persona.findMany({
      where: { id: { in: panel.personaIds } },
      select: { id: true, name: true, token: true, tags: true, extra: true },
    });

    return {
      success: true,
      data: {
        timeline: {
          token: timeline.token,
          instruction: timeline.instruction,
          events: timeline.events ?? [],
          summary: timeline.summary,
          minutes: timeline.minutes,
          createdAt: timeline.createdAt,
        },
        personas,
      },
    };
  });
}

export async function fetchInterviewsByPanelId(
  panelId: number,
): Promise<ServerActionResult<{ interviews: PanelInterview[]; totalPersonas: number }>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findUnique({ where: { id: panelId, userId: user.id } });
    if (!panel) {
      return { success: false, code: "forbidden", message: "Panel not found" };
    }

    const interviews = await prisma.analystInterview.findMany({
      where: { personaPanelId: panelId },
      include: {
        persona: { select: { id: true, name: true, token: true, extra: true } },
        interviewUserChat: {
          select: {
            token: true,
            backgroundToken: true,
            _count: { select: { messages: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const panelInterviews: PanelInterview[] = interviews
      .filter((i) => i.persona !== null)
      .map((i) => {
        const hasConclusion = i.conclusion !== "";
        const isRunning = i.interviewUserChat?.backgroundToken != null;
        const status: PanelInterview["status"] = hasConclusion
          ? "completed"
          : isRunning
            ? "in-progress"
            : "pending";

        return {
          id: i.id,
          personaId: i.persona!.id,
          personaName: i.persona!.name,
          personaToken: i.persona!.token,
          personaExtra: i.persona!.extra,
          status,
          conclusion: i.conclusion,
          messageCount: i.interviewUserChat?._count.messages ?? 0,
          interviewUserChat: i.interviewUserChat
            ? {
                token: i.interviewUserChat.token,
                backgroundToken: i.interviewUserChat.backgroundToken,
              }
            : null,
          createdAt: i.createdAt,
        };
      });

    return {
      success: true,
      data: {
        interviews: panelInterviews,
        totalPersonas: panel.personaIds.length,
      },
    };
  });
}

export async function fetchInterviewMessages(
  panelId: number,
  interviewId: number,
): Promise<ServerActionResult<UIMessage[]>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findUnique({
      where: { id: panelId, userId: user.id },
      select: { id: true },
    });
    if (!panel) {
      return { success: false, code: "forbidden", message: "Panel not found" };
    }

    const interview = await prisma.analystInterview.findUnique({
      where: { id: interviewId, personaPanelId: panelId },
      select: {
        interviewUserChat: {
          select: {
            messages: { orderBy: { id: "asc" } },
          },
        },
      },
    });
    if (!interview) {
      return { success: false, code: "not_found", message: "Interview not found" };
    }

    const messages: UIMessage[] = (interview.interviewUserChat?.messages ?? []).map(
      convertDBMessageToAIMessage,
    );

    return { success: true, data: messages };
  });
}
