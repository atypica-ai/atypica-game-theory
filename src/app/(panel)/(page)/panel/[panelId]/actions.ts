"use server";

import { UserChatContext } from "@/app/(study)/context/types";
import { createStudyUserChat } from "@/app/(study)/study/lib";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import type { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

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

export interface ResearchProject {
  token: string;
  title: string;
  kind: string;
  context: UserChatContext;
  backgroundToken: string | null;
  createdAt: Date;
  updatedAt: Date;
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

export async function fetchResearchProjectsByPanelId(
  panelId: number,
): Promise<ServerActionResult<ResearchProject[]>> {
  return withAuth(async (user) => {
    const userChats = await prisma.userChat.findMany({
      where: {
        userId: user.id,
        context: { path: ["personaPanelId"], equals: panelId },
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

    return { success: true, data: userChats };
  });
}

export async function createStudyFromPanel(
  panelId: number,
  content: string,
): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    const panel = await prisma.personaPanel.findUnique({
      where: { id: panelId, userId: user.id },
    });

    if (!panel) {
      return { success: false, code: "not_found", message: "PersonaPanel not found" };
    }

    const userChat = await createStudyUserChat({
      userId: user.id,
      role: "user",
      content,
      context: { personaPanelId: panelId },
    });

    return { success: true, data: { token: userChat.token } };
  });
}
