"use server";

import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import { UserChatContext } from "@/app/(study)/context/types";
import { mergeUserChatContext } from "@/app/(study)/context/utils";
import { executeUniversalAgent } from "@/app/(universal)/agent";
import { createUniversalUserChat } from "@/app/(universal)/universal/actions";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { detectInputLanguage } from "@/lib/textUtils";
import type { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
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

export async function createUniversalAgentFromPanel(
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

    // Fetch persona details so Agent knows which personas to use directly
    const personas = await prisma.persona.findMany({
      where: { id: { in: panel.personaIds } },
      select: { id: true, name: true, tags: true },
    });

    const panelPersonaLines = personas
      .map(
        (p) =>
          `- ID: ${p.id}, Name: "${p.name}"${p.tags?.length ? `, Tags: [${p.tags.join(", ")}]` : ""}`,
      )
      .join("\n");

    const enrichedContent = `${content}\n\n---\n<panel_context>\nThis research uses a pre-selected panel (panelId: ${panelId}) with ${personas.length} personas.\nUse these personas directly for interviews and discussions — do NOT search for new ones.\n\n${panelPersonaLines}\n</panel_context>`;

    const createResult = await createUniversalUserChat({
      role: "user",
      content: enrichedContent,
    });
    if (!createResult.success) {
      return { success: false, code: createResult.code, message: createResult.message };
    }

    const defaultLocale = await detectInputLanguage({
      text: content,
      fallbackLocale: await getLocale(),
    });

    await mergeUserChatContext({
      id: createResult.data.id,
      context: {
        personaPanelId: panelId,
        defaultLocale,
      },
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
      userChat: {
        id: createResult.data.id,
        token: createResult.data.token,
        extra: createResult.data.extra,
      },
      statReport,
      logger,
      locale: defaultLocale,
    });

    return { success: true, data: { token: createResult.data.token } };
  });
}
