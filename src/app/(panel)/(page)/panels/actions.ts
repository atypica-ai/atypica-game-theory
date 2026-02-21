"use server";

import { initGenericUserChatStatReporter } from "@/ai/tools/stats";
import { executeUniversalAgent } from "@/app/(universal)/agent";
import { createUniversalUserChat } from "@/app/(universal)/universal/actions";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { getLocale } from "next-intl/server";
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
 * Creates a UserChat with a guiding user message, auto-executes the Agent,
 * and returns the chat token for navigation.
 */
export async function createPanelViaAgent(): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    const locale = await getLocale();
    const content =
      locale === "zh-CN"
        ? "帮我创建一个 Persona Panel。先了解我需要什么样的 personas，然后搜索并推荐合适的人选。"
        : "Help me create a Persona Panel. First understand what kind of personas I need, then search and recommend suitable candidates.";

    const createResult = await createUniversalUserChat({
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
