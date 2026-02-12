"use server";

import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import type { Persona, PersonaExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

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
): Promise<ServerActionResult<PersonaPanelWithDetails & { personasWithAttributes: PersonaWithAttributes[] }>> {
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
    const panelWithDetails: PersonaPanelWithDetails & { personasWithAttributes: PersonaWithAttributes[] } = {
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
