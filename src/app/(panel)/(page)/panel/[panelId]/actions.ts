"use server";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { UserChatContext } from "@/app/(study)/context/types";
import { StudyToolName } from "@/app/(study)/tools/types";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import type { Persona } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getToolName, isToolUIPart } from "ai";

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
  stats: {
    artifacts: number;
    interviews: number;
    discussions: number;
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
        messages: {
          where: { role: "assistant" },
          select: { messageId: true, role: true, parts: true, extra: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats for each project by analyzing tool calls in messages
    const projectsWithStats = userChats.map((chat) => {
      let artifactsCount = 0;
      let interviewsCount = 0;
      let discussionsCount = 0;

      for (const dbMessage of chat.messages) {
        const message = convertDBMessageToAIMessage(dbMessage);
        for (const part of message.parts) {
          if (!isToolUIPart(part)) continue;
          const toolName = getToolName(part);

          // Count artifacts (reports + podcasts with output)
          if (
            (toolName === StudyToolName.generateReport ||
              toolName === StudyToolName.generatePodcast) &&
            part.state === "output-available"
          ) {
            artifactsCount++;
          }

          // Count interviews
          if (toolName === StudyToolName.interviewChat) {
            interviewsCount++;
          }

          // Count discussions
          if (toolName === StudyToolName.discussionChat) {
            discussionsCount++;
          }
        }
      }

      return {
        token: chat.token,
        title: chat.title,
        kind: chat.kind,
        context: chat.context as UserChatContext,
        backgroundToken: chat.backgroundToken,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        stats: {
          artifacts: artifactsCount,
          interviews: interviewsCount,
          discussions: discussionsCount,
        },
      };
    });

    return { success: true, data: projectsWithStats };
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
