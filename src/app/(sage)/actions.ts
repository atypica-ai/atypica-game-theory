"use server";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import { generateToken } from "@/lib/utils";
import type { Sage, SageChat, SageInterview, UserChat } from "@/prisma/client";
import { InputJsonObject } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { getPendingSageKnowledgeGaps, getSageById } from "./lib";
import { generateInterviewPlan } from "./processing/followup";
import { analyzeKnowledgeOnly } from "./processing/gaps";
import { extractKnowledgeOnly } from "./processing/memory";
import { processSourcesOnly } from "./processing/sources";
import type { CreateSageInput, SageInterviewExtra } from "./types";
import { createSageInputSchema } from "./types";

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
      const validated = createSageInputSchema.parse(input);
      const sage = await prisma.sage.create({
        data: {
          token: generateToken(),
          userId: user.id,
          name: validated.name,
          domain: validated.domain,
          locale: validated.locale, // TODO 需要自动识别
          expertise: [],
          extra: {},
          // Create sources
          sources: {
            create: validated.sources.map((source) => ({
              content: source as unknown as InputJsonObject,
              status: "pending",
              title: "",
              extractedText: "",
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
export async function analyzeSageKnowledge(sageId: number): Promise<ServerActionResult<void>> {
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
        severity: gap.severity,
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
          extra: {
            startsAt: Date.now(),
            ongoing: true,
            interviewPlan,
          } as SageInterviewExtra,
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
export async function processSageSources(sageId: number): Promise<ServerActionResult<void>> {
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
export async function extractSageKnowledge(sageId: number): Promise<ServerActionResult<void>> {
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
