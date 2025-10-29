"use server";

import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import type { Sage, SageChat, SageInterview, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { generateSageToken, getSageById, getSageByToken } from "./lib";
import {
  processSourcesOnly,
  extractKnowledgeOnly,
  analyzeKnowledgeOnly,
} from "./processing";
import type { CreateSageInput, UpdateSageInput } from "./types";
import { createSageInputSchema, updateSageInputSchema } from "./types";

// ===== Sage Creation and Management =====

/**
 * Create a new sage with initial content
 * Triggers background processing to build Memory Document
 */
export async function createSage(
  input: CreateSageInput,
): Promise<ServerActionResult<{ sage: Sage; userChat: UserChat }>> {
  return withAuth(async (user) => {
    try {
      // Validate input
      const validated = createSageInputSchema.parse(input);

      // Create sage record with sources
      const sage = await prisma.sage.create({
        data: {
          token: generateSageToken(),
          userId: user.id,
          name: validated.name,
          domain: validated.domain,
          locale: validated.locale,
          expertise: [],
          attachments: [], // Deprecated, keeping for backward compatibility
          extra: {},
          // Create sources
          sources: {
            create: validated.sources.map((source) => ({
              type: source.type,
              content: source.content,
              status: "pending",
            })),
          },
        },
      });

      rootLogger.info({
        msg: "Created sage with sources",
        sageId: sage.id,
        userId: user.id,
        sourcesCount: validated.sources.length,
      });

      // Create a UserChat for management/viewing
      const userChat = await createUserChat({
        userId: user.id,
        kind: "misc",
        title: `Sage: ${validated.name}`,
      });

      // No automatic processing - user must trigger manually

      return {
        success: true,
        data: { sage, userChat },
      };
    } catch (error) {
      rootLogger.error("Failed to create sage:", error);
      return {
        success: false,
        message: "Failed to create sage",
        code: "internal_server_error",
      };
    }
  });
}

/**
 * Get sage by token (public or owner access)
 */
export async function fetchSage(token: string): Promise<
  ServerActionResult<
    Awaited<ReturnType<typeof getSageByToken>> // TODO: 最好是直接定义出来
  >
> {
  try {
    const sage = await getSageByToken(token);

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    // TODO: Check if sage is public or user is owner
    // For now, allow all access

    return {
      success: true,
      data: sage,
    };
  } catch (error) {
    rootLogger.error("Failed to fetch sage:", error);
    return {
      success: false,
      message: "Failed to fetch sage",
      code: "internal_server_error",
    };
  }
}

/**
 * Update sage basic information
 */
export async function updateSage(
  sageId: number,
  input: UpdateSageInput,
): Promise<ServerActionResult<Sage>> {
  return withAuth(async (user) => {
    try {
      // Validate input
      const validated = updateSageInputSchema.parse(input);

      // Check ownership
      const existing = await prisma.sage.findUnique({
        where: { id: sageId },
        select: { userId: true },
      });

      if (!existing) {
        return {
          success: false,
          message: "Sage not found",
          code: "not_found",
        };
      }

      if (existing.userId !== user.id) {
        return {
          success: false,
          message: "Unauthorized",
          code: "unauthorized",
        };
      }

      // Update sage
      const sage = await prisma.sage.update({
        where: { id: sageId },
        data: validated,
      });

      rootLogger.info(`Updated sage ${sageId} by user ${user.id}`);

      revalidatePath(`/sage/${sage.token}`);

      return {
        success: true,
        data: sage,
      };
    } catch (error) {
      rootLogger.error("Failed to update sage:", error);
      return {
        success: false,
        message: "Failed to update sage",
        code: "internal_server_error",
      };
    }
  });
}

/**
 * Delete a sage
 */
export async function deleteSage(sageId: number): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    try {
      // Check ownership
      const existing = await prisma.sage.findUnique({
        where: { id: sageId },
        select: { userId: true, token: true },
      });

      if (!existing) {
        return {
          success: false,
          message: "Sage not found",
          code: "not_found",
        };
      }

      if (existing.userId !== user.id) {
        return {
          success: false,
          message: "Unauthorized",
          code: "unauthorized",
        };
      }

      // Delete sage (cascades to chats and interviews)
      await prisma.sage.delete({
        where: { id: sageId },
      });

      rootLogger.info(`Deleted sage ${sageId} by user ${user.id}`);

      revalidatePath("/sages");

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      rootLogger.error("Failed to delete sage:", error);
      return {
        success: false,
        message: "Failed to delete sage",
        code: "internal_server_error",
      };
    }
  });
}

/**
 * List user's sages
 */
export async function listMySages(): Promise<
  ServerActionResult<Array<Sage & { _count: { chats: number; interviews: number } }>>
> {
  return withAuth(async (user) => {
    try {
      const sages = await prisma.sage.findMany({
        where: { userId: user.id },
        include: {
          _count: {
            select: {
              chats: true,
              interviews: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return {
        success: true,
        data: sages,
      };
    } catch (error) {
      rootLogger.error("Failed to list sages:", error);
      return {
        success: false,
        message: "Failed to list sages",
        code: "internal_server_error",
      };
    }
  });
}

// ===== Knowledge Analysis =====

/**
 * Analyze sage knowledge completeness
 */
export async function analyzeSageKnowledge(
  sageId: number,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const result = await getSageById(sageId);

    if (!result) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    const { sage, memoryDocument } = result;

    if (sage.userId !== user.id) {
      return {
        success: false,
        message: "Unauthorized",
        code: "unauthorized",
      };
    }

    if (!memoryDocument) {
      return {
        success: false,
        message: "Memory document not ready",
        code: "forbidden",
      };
    }

    const locale = await getLocale();

    // Trigger background analysis only
    waitUntil(analyzeKnowledgeOnly({ sageId, locale }));

    revalidatePath(`/sage/${sage.token}`);

    return { success: true, data: undefined };
  });
}

// ===== Supplementary Interview =====

/**
 * Create a supplementary interview to fill knowledge gaps
 */
export async function createSupplementaryInterview(sageId: number): Promise<
  ServerActionResult<{
    interview: SageInterview;
    userChat: UserChat;
  }>
> {
  return withAuth(async (user) => {
    try {
      // Check ownership
      const result = await getSageById(sageId);

      if (!result) {
        return {
          success: false,
          message: "Sage not found",
          code: "not_found",
        };
      }

      const { sage } = result;

      if (sage.userId !== user.id) {
        return {
          success: false,
          message: "Unauthorized",
          code: "unauthorized",
        };
      }

      const locale = await getLocale();

      // Get pending knowledge gaps from database
      const { getPendingSageKnowledgeGaps, generateInterviewPlan } = await import("./lib");
      const pendingGaps = await getPendingSageKnowledgeGaps(sageId);

      if (pendingGaps.length === 0) {
        return {
          success: false,
          message: locale === "zh-CN" ? "没有待解决的知识空白" : "No pending knowledge gaps",
          code: "forbidden",
        };
      }

      // Convert to format expected by generateInterviewPlan
      const fullKnowledgeGaps = pendingGaps.map((gap) => ({
        area: gap.area,
        severity: gap.severity as "critical" | "important" | "nice-to-have",
        description: gap.description,
        impact: gap.impact,
        suggestedQuestions: [], // Will be generated by AI
      }));

      // Generate interview plan
      const interviewPlan = await generateInterviewPlan({
        sage: {
          name: sage.name,
          domain: sage.domain,
          expertise: sage.expertise,
        },
        knowledgeGaps: fullKnowledgeGaps,
        locale,
      });

      // Create UserChat for interview
      const userChat = await createUserChat({
        userId: user.id,
        kind: "sageSession",
        title: `Interview: ${sage.name}`,
      });

      // Create SageInterview
      const interview = await prisma.sageInterview.create({
        data: {
          sageId,
          userChatId: userChat.id,
          purpose: interviewPlan.purpose,
          focusAreas: interviewPlan.focusAreas,
          status: "ongoing",
          progress: 0,
          extra: { interviewPlan },
        },
      });

      rootLogger.info(`Created supplementary interview ${interview.id} for sage ${sageId}`);

      return {
        success: true,
        data: { interview, userChat },
      };
    } catch (error) {
      rootLogger.error("Failed to create supplementary interview:", error);
      return {
        success: false,
        message: "Failed to create supplementary interview",
        code: "internal_server_error",
      };
    }
  });
}

/**
 * Get interview by userChatId
 */
export async function fetchSageInterview(
  userChatId: number,
): Promise<ServerActionResult<SageInterview & { sage: Sage }>> {
  try {
    const interview = await prisma.sageInterview.findUnique({
      where: { userChatId },
      include: {
        sage: true,
      },
    });

    if (!interview) {
      return {
        success: false,
        message: "Interview not found",
        code: "not_found",
      };
    }

    return {
      success: true,
      data: interview,
    };
  } catch (error) {
    rootLogger.error("Failed to fetch interview:", error);
    return {
      success: false,
      message: "Failed to fetch interview",
      code: "internal_server_error",
    };
  }
}

/**
 * Complete a supplementary interview
 * Triggers Memory Document update
 */
export async function completeSupplementaryInterview(
  interviewId: number,
  summary: string,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    try {
      // Get interview with sage
      const interview = await prisma.sageInterview.findUnique({
        where: { id: interviewId },
        include: {
          sage: {
            select: { id: true, userId: true },
          },
        },
      });

      if (!interview) {
        return {
          success: false,
          message: "Interview not found",
          code: "not_found",
        };
      }

      if (interview.sage.userId !== user.id) {
        return {
          success: false,
          message: "Unauthorized",
          code: "unauthorized",
        };
      }

      // Update interview status
      await prisma.sageInterview.update({
        where: { id: interviewId },
        data: {
          status: "completed",
          progress: 1,
          summary,
          extra: {
            completedAt: new Date().toISOString(),
          },
        },
      });

      rootLogger.info(
        `Completed supplementary interview ${interviewId} for sage ${interview.sageId}`,
      );

      // Trigger Memory Document update in background
      waitUntil(
        (async () => {
          try {
            const locale = await getLocale();
            const { updateMemoryDocumentFromInterview } = await import("./processing");

            await updateMemoryDocumentFromInterview({
              sageId: interview.sageId,
              interviewId,
              locale,
            });

            rootLogger.info(
              `Updated Memory Document for sage ${interview.sageId} from interview ${interviewId}`,
            );
          } catch (error) {
            rootLogger.error(
              `Failed to update Memory Document from interview ${interviewId}:`,
              error,
            );
          }
        })(),
      );

      revalidatePath(`/sage/${interview.sage.id}`);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      rootLogger.error("Failed to complete interview:", error);
      return {
        success: false,
        message: "Failed to complete interview",
        code: "internal_server_error",
      };
    }
  });
}

// ===== Sage Chat =====

/**
 * Create or get sage chat session
 */
export async function createOrGetSageChat(sageId: number): Promise<
  ServerActionResult<{
    sageChat: SageChat;
    userChat: UserChat;
  }>
> {
  return withAuth(async (user) => {
    try {
      // Check if sage exists and is accessible
      const result = await getSageById(sageId);

      if (!result) {
        return {
          success: false,
          message: "Sage not found",
          code: "not_found",
        };
      }

      const { sage } = result;

      // Check if user can access (owner or public)
      if (!sage.isPublic && sage.userId !== user.id) {
        return {
          success: false,
          message: "Unauthorized",
          code: "unauthorized",
        };
      }

      // Check if chat already exists
      const existingChat = await prisma.sageChat.findFirst({
        where: {
          sageId,
          userId: user.id,
        },
        include: {
          userChat: true,
        },
      });

      if (existingChat) {
        return {
          success: true,
          data: {
            sageChat: existingChat,
            userChat: existingChat.userChat,
          },
        };
      }

      // Create new chat
      const userChat = await createUserChat({
        userId: user.id,
        kind: "sageSession",
        title: `Chat with ${sage.name}`,
      });

      const sageChat = await prisma.sageChat.create({
        data: {
          sageId,
          userChatId: userChat.id,
          userId: user.id,
          chatType: "consultation",
        },
      });

      rootLogger.info(`Created sage chat ${sageChat.id} for user ${user.id} with sage ${sageId}`);

      return {
        success: true,
        data: { sageChat, userChat },
      };
    } catch (error) {
      rootLogger.error("Failed to create/get sage chat:", error);
      return {
        success: false,
        message: "Failed to create chat",
        code: "internal_server_error",
      };
    }
  });
}

/**
 * Process all pending sources for a sage
 */
export async function processSageSources(
  sageId: number,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const result = await getSageById(sageId);

    if (!result) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    const { sage } = result;

    if (sage.userId !== user.id) {
      return {
        success: false,
        message: "Not authorized",
        code: "forbidden",
      };
    }

    // Trigger background processing of sources only
    waitUntil(processSourcesOnly(sageId));

    revalidatePath(`/sage/${sage.token}`);

    return { success: true, data: undefined };
  });
}

/**
 * Extract knowledge and build memory document from completed sources
 */
export async function extractSageKnowledge(
  sageId: number,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const result = await getSageById(sageId);

    if (!result) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    const { sage } = result;

    if (sage.userId !== user.id) {
      return {
        success: false,
        message: "Not authorized",
        code: "forbidden",
      };
    }

    const locale = await getLocale();

    // Trigger background knowledge extraction
    waitUntil(extractKnowledgeOnly({ sageId, locale }));

    revalidatePath(`/sage/${sage.token}`);

    return { success: true, data: undefined };
  });
}

