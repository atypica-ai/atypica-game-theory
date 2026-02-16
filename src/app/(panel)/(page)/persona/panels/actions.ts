"use server";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { DiscussionTimelineEvent } from "@/app/(panel)/types";
import { UserChatContext } from "@/app/(study)/context/types";
import { createStudyUserChat } from "@/app/(study)/study/lib";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import type { Persona, PersonaExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import type { UIMessage } from "ai";

export interface PersonaPanelWithDetails {
  id: number;
  title: string;
  instruction: string;
  personaIds: number[];
  personas: Pick<Persona, "id" | "name" | "token" | "tags">[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: {
    discussions: number;
    interviews: number;
  };
}

/**
 * Fetch all PersonaPanels created by the current user
 */
export async function fetchUserPersonaPanels(): Promise<
  ServerActionResult<PersonaPanelWithDetails[]>
> {
  return withAuth(async (user) => {
    const panels = await prisma.personaPanel.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        discussionTimelines: {
          select: { id: true },
        },
        analystInterviews: {
          select: { id: true },
        },
      },
    });

    // Fetch all personas for all panels in one query
    const allPersonaIds = panels.flatMap((panel) => panel.personaIds);
    const uniquePersonaIds = [...new Set(allPersonaIds)];

    const personas = await prisma.persona.findMany({
      where: {
        id: { in: uniquePersonaIds },
      },
      select: {
        id: true,
        name: true,
        token: true,
        tags: true,
      },
    });

    // Create persona lookup map
    const personaMap = new Map(personas.map((p) => [p.id, p]));

    // Transform data
    const panelsWithDetails: PersonaPanelWithDetails[] = panels.map((panel) => ({
      id: panel.id,
      title: panel.title,
      instruction: panel.instruction,
      personaIds: panel.personaIds, // as number[],
      personas: panel.personaIds
        .map((id) => personaMap.get(id))
        .filter((p): p is Pick<Persona, "id" | "name" | "token" | "tags"> => p !== undefined),
      createdAt: panel.createdAt,
      updatedAt: panel.updatedAt,
      usageCount: {
        discussions: panel.discussionTimelines.length,
        interviews: panel.analystInterviews.length,
      },
    }));

    return {
      success: true,
      data: panelsWithDetails,
    };
  });
}

/**
 * Fetch a single PersonaPanel by ID with full details
 */
export interface PersonaWithAttributes {
  id: number;
  name: string;
  token: string;
  tags: string[];
  source: string;
  prompt: string;
  createdAt: Date;
  extra: PersonaExtra;
}

export async function fetchPersonaPanelById(
  panelId: number,
): Promise<
  ServerActionResult<PersonaPanelWithDetails & { personasWithAttributes: PersonaWithAttributes[] }>
> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findFirst({
      where: {
        id: panelId,
        userId: user.id,
      },
      include: {
        discussionTimelines: {
          select: { id: true },
        },
        analystInterviews: {
          select: { id: true },
        },
      },
    });

    if (!panel) {
      return {
        success: false,
        code: "not_found",
        message: "PersonaPanel not found or you don't have permission to view it",
      };
    }

    // Fetch personas with full details
    const personasWithAttributes = await prisma.persona.findMany({
      where: {
        id: { in: panel.personaIds as number[] },
      },
      select: {
        id: true,
        name: true,
        token: true,
        tags: true,
        source: true,
        prompt: true,
        createdAt: true,
        extra: true,
      },
    });

    // Create persona lookup map for basic info
    const personaMap = new Map(personasWithAttributes.map((p) => [p.id, p]));

    // Transform data
    const panelWithDetails: PersonaPanelWithDetails & {
      personasWithAttributes: PersonaWithAttributes[];
    } = {
      id: panel.id,
      title: panel.title,
      instruction: panel.instruction,
      personaIds: panel.personaIds,
      personas: panel.personaIds
        .map((id) => {
          const p = personaMap.get(id);
          return p ? { id: p.id, name: p.name, token: p.token, tags: p.tags } : undefined;
        })
        .filter((p): p is Pick<Persona, "id" | "name" | "token" | "tags"> => p !== undefined),
      personasWithAttributes: panel.personaIds
        .map((id) => personaMap.get(id))
        .filter((p): p is PersonaWithAttributes => p !== undefined),
      createdAt: panel.createdAt,
      updatedAt: panel.updatedAt,
      usageCount: {
        discussions: panel.discussionTimelines.length,
        interviews: panel.analystInterviews.length,
      },
    };

    return {
      success: true,
      data: panelWithDetails,
    };
  });
}

/**
 * Delete a PersonaPanel by ID
 */
export async function deletePersonaPanel(
  panelId: number,
): Promise<ServerActionResult<{ id: number }>> {
  return withAuth(async (user) => {
    // Check ownership
    const panel = await prisma.personaPanel.findFirst({
      where: {
        id: panelId,
        userId: user.id,
      },
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

    // Check if panel is being used
    if (panel.discussionTimelines.length > 0 || panel.analystInterviews.length > 0) {
      return {
        success: false,
        code: "forbidden",
        message: "Cannot delete PersonaPanel that is being used in discussions or interviews",
      };
    }

    // Delete the panel
    await prisma.personaPanel.delete({
      where: { id: panelId },
    });

    return {
      success: true,
      data: { id: panelId },
    };
  });
}

/**
 * Fetch all research projects (UserChats) associated with a PersonaPanel
 */
export interface ResearchProject {
  token: string;
  title: string;
  kind: string;
  context: UserChatContext;
  backgroundToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function fetchResearchProjectsByPanelId(
  panelId: number,
): Promise<ServerActionResult<ResearchProject[]>> {
  return withAuth(async (user) => {
    const userChats = await prisma.userChat.findMany({
      where: {
        userId: user.id,
        context: {
          path: ["personaPanelId"],
          equals: panelId,
        },
      },
      select: {
        token: true,
        title: true,
        kind: true,
        context: true,
        backgroundToken: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: userChats,
    };
  });
}

/**
 * Create a new study UserChat from a Panel (with personaPanelId pre-set in context)
 */
export async function createStudyFromPanel(
  panelId: number,
  content: string,
): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findFirst({
      where: { id: panelId, userId: user.id },
    });

    if (!panel) {
      return {
        success: false,
        code: "not_found",
        message: "PersonaPanel not found",
      };
    }

    const userChat = await createStudyUserChat({
      userId: user.id,
      role: "user",
      content,
      context: {
        personaPanelId: panelId,
      },
    });

    return {
      success: true,
      data: { token: userChat.token },
    };
  });
}

/**
 * Fetch all discussions for a panel (summary view)
 */
export interface DiscussionSummary {
  token: string;
  instruction: string;
  summary: string;
  eventCount: number;
  participantIds: number[];
  createdAt: Date;
  isComplete: boolean;
}

export async function fetchDiscussionsByPanelId(
  panelId: number,
): Promise<ServerActionResult<DiscussionSummary[]>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findFirst({
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
      const events = (t.events ?? []) as DiscussionTimelineEvent[];
      const participantIds = [
        ...new Set(
          events
            .filter((e): e is DiscussionTimelineEvent & { type: "persona-reply" } => e.type === "persona-reply")
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

/**
 * Fetch a single discussion with panel personas (for detail view)
 */
export async function fetchDiscussionDetail(
  panelId: number,
  timelineToken: string,
): Promise<
  ServerActionResult<{
    timeline: {
      token: string;
      instruction: string;
      events: DiscussionTimelineEvent[];
      summary: string;
      minutes: string;
      createdAt: Date;
    };
    personas: PersonaWithAttributes[];
  }>
> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findFirst({
      where: { id: panelId, userId: user.id },
    });
    if (!panel) {
      return { success: false, code: "forbidden", message: "Panel not found" };
    }

    const timeline = await prisma.discussionTimeline.findFirst({
      where: { token: timelineToken, personaPanelId: panelId },
    });
    if (!timeline) {
      return { success: false, code: "not_found", message: "Discussion not found" };
    }

    const personas = await prisma.persona.findMany({
      where: { id: { in: panel.personaIds as number[] } },
      select: {
        id: true,
        name: true,
        token: true,
        tags: true,
        source: true,
        prompt: true,
        createdAt: true,
        extra: true,
      },
    });

    return {
      success: true,
      data: {
        timeline: {
          token: timeline.token,
          instruction: timeline.instruction,
          events: (timeline.events ?? []) as DiscussionTimelineEvent[],
          summary: timeline.summary,
          minutes: timeline.minutes,
          createdAt: timeline.createdAt,
        },
        personas: personas as PersonaWithAttributes[],
      },
    };
  });
}

/**
 * Fetch all interviews for a panel (aggregated view, no messages)
 */
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

export async function fetchInterviewsByPanelId(
  panelId: number,
): Promise<ServerActionResult<{ interviews: PanelInterview[]; totalPersonas: number }>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findFirst({
      where: { id: panelId, userId: user.id },
    });
    if (!panel) {
      return { success: false, code: "forbidden", message: "Panel not found" };
    }

    const interviews = await prisma.analystInterview.findMany({
      where: { personaPanelId: panelId },
      include: {
        persona: {
          select: { id: true, name: true, token: true, extra: true },
        },
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
          personaExtra: i.persona!.extra as PersonaExtra,
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
        totalPersonas: (panel.personaIds as number[]).length,
      },
    };
  });
}

/**
 * Fetch messages for a single interview (lazy-loaded when user expands)
 */
export async function fetchInterviewMessages(
  panelId: number,
  interviewId: number,
): Promise<ServerActionResult<UIMessage[]>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findFirst({
      where: { id: panelId, userId: user.id },
      select: { id: true },
    });
    if (!panel) {
      return { success: false, code: "forbidden", message: "Panel not found" };
    }

    const interview = await prisma.analystInterview.findFirst({
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
