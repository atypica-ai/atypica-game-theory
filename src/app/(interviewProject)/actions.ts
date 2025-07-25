"use server";
import { createTextEmbedding } from "@/ai/embedding";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import { generateToken } from "@/lib/utils";
import { ChatMessage, InterviewProject } from "@/prisma/client";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { generateId } from "ai";
import { runAutoPersonaInterview } from "./(session)/api/chat/interview-agent/auto-persona";
import {
  decryptInterviewShareToken,
  generateInterviewShareToken,
  generateInterviewTitle,
} from "./lib";
import {
  CreateHumanInterviewSessionInput,
  CreateInterviewProjectInput,
  CreatePersonaInterviewSessionInput,
  InterviewProjectWithSessions,
  InterviewSessionWithDetails,
} from "./types";

/**
 * Create a new interview project
 */
export async function createInterviewProject(
  input: CreateInterviewProjectInput,
): Promise<ServerActionResult<{ id: number; token: string }>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProject.create({
      data: {
        userId: user.id,
        brief: input.brief.trim(),
        token: generateToken(), // TODO: 暂时用不到
      },
    });
    return {
      success: true,
      data: { id: project.id, token: project.token },
    };
  });
}

/**
 * Fetch user's interview projects
 */
export async function fetchUserInterviewProjects(): Promise<
  ServerActionResult<InterviewProjectWithSessions[]>
> {
  return withAuth(async (user) => {
    const projects = await prisma.interviewProject.findMany({
      where: { userId: user.id },
      include: {
        sessions: {
          select: {
            id: true,
            intervieweeUserId: true,
            intervieweePersonaId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: projects as InterviewProjectWithSessions[],
    };
  });
}

/**
 * Fetch interview project by ID
 */
export async function fetchInterviewProjectById(
  projectId: number,
): Promise<ServerActionResult<InterviewProjectWithSessions>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProject.findUnique({
      where: { id: projectId, userId: user.id },
      include: {
        sessions: {
          select: {
            id: true,
            intervieweeUserId: true,
            intervieweePersonaId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        reports: {
          select: {
            id: true,
            token: true,
            generatedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return {
        success: false,
        code: "not_found",
        message: "Interview project not found",
      };
    }

    return {
      success: true,
      data: project as InterviewProjectWithSessions,
    };
  });
}

/**
 * Generate share token for interview project
 */
export async function generateProjectShareToken(
  projectId: number,
  expiryHours: number = 24,
): Promise<ServerActionResult<{ shareToken: string; shareUrl: string }>> {
  return withAuth(async (user) => {
    // Verify project ownership
    const project = await prisma.interviewProject.findUnique({
      where: { id: projectId, userId: user.id },
    });

    if (!project) {
      return {
        success: false,
        code: "not_found",
        message: "Interview project not found",
      };
    }

    const shareToken = generateInterviewShareToken(projectId, expiryHours);

    // Note: In a real application, you might want to get the base URL from environment variables
    const shareUrl = `/interview/invite/${shareToken}`;

    return {
      success: true,
      data: { shareToken, shareUrl },
    };
  });
}

/**
 * Validate share token and get project info
 */
export async function validateShareToken(
  shareToken: string,
): Promise<ServerActionResult<{ projectId: number; ownerName: string }>> {
  const payload = decryptInterviewShareToken(shareToken);

  if (!payload) {
    return {
      success: false,
      code: "not_found",
      message: "Invalid or expired share token",
    };
  }

  const project = await prisma.interviewProject.findUnique({
    where: { id: payload.projectId },
    select: {
      id: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!project) {
    return {
      success: false,
      code: "not_found",
      message: "Interview project not found",
    };
  }

  return {
    success: true,
    data: {
      projectId: project.id,
      ownerName: project.user.email,
    },
  };
}

/**
 * Create interview session for human interviewee
 */
export async function createHumanInterviewSession(
  input: CreateHumanInterviewSessionInput,
): Promise<ServerActionResult<{ sessionId: number; chatToken: string }>> {
  return withAuth(async (user) => {
    const userId = user.id;

    // Validate share token
    const payload = decryptInterviewShareToken(input.shareToken);
    if (!payload || payload.projectId !== input.projectId) {
      return {
        success: false,
        code: "not_found",
        message: "Invalid or expired share token",
      };
    }

    // Get project details
    const project = await prisma.interviewProject.findUnique({
      where: { id: input.projectId },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!project) {
      return {
        success: false,
        code: "not_found",
        message: "Interview project not found",
      };
    }

    // Check if user already has a session for this project
    const existingSession = await prisma.interviewSession.findFirst({
      where: {
        projectId: input.projectId,
        intervieweeUserId: userId,
      },
      include: {
        userChat: {
          select: { token: true },
        },
      },
    });

    if (existingSession && existingSession.userChat) {
      return {
        success: true,
        data: {
          sessionId: existingSession.id,
          chatToken: existingSession.userChat.token,
        },
      };
    }

    // Create session and user chat in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user chat for the interview
      const userChat = await createUserChat({
        userId: project.userId, // Chat belongs to project owner
        title: generateInterviewTitle(project.brief, false),
        kind: "interviewSession",
        tx,
      });

      // Create interview session
      const interviewSession = await tx.interviewSession.create({
        data: {
          projectId: input.projectId,
          userChatId: userChat.id,
          intervieweeUserId: userId,
        },
      });

      // Add initial message to start the conversation
      await tx.chatMessage.create({
        data: {
          messageId: generateId(),
          userChatId: userChat.id,
          role: "user",
          content: "[READY]",
          parts: [{ type: "text", text: "[READY]" }] as InputJsonValue,
        },
      });

      return { sessionId: interviewSession.id, chatToken: userChat.token };
    });

    return {
      success: true,
      data: result,
    };
  });
}

/**
 * Create interview session for persona interviewee
 */
export async function createPersonaInterviewSession(
  input: CreatePersonaInterviewSessionInput,
): Promise<ServerActionResult<{ sessionId: number; chatToken: string; autoStart?: boolean }>> {
  return withAuth(async (user) => {
    // Verify project ownership
    const project = await prisma.interviewProject.findUnique({
      where: { id: input.projectId, userId: user.id },
    });

    if (!project) {
      return {
        success: false,
        code: "not_found",
        message: "Interview project not found",
      };
    }

    // Verify persona exists
    const persona = await prisma.persona.findUnique({
      where: { id: input.personaId },
      select: { id: true, name: true, prompt: true },
    });

    if (!persona) {
      return {
        success: false,
        code: "not_found",
        message: "Persona not found",
      };
    }

    // Create session and user chat in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user chat for the interview
      const userChat = await createUserChat({
        userId: user.id,
        title: generateInterviewTitle(project.brief, true, persona.name),
        kind: "interviewSession",
        tx,
      });

      // Create interview session
      const interviewSession = await tx.interviewSession.create({
        data: {
          projectId: input.projectId,
          userChatId: userChat.id,
          intervieweePersonaId: input.personaId,
        },
      });

      return {
        sessionId: interviewSession.id,
        chatToken: userChat.token,
        userChatId: userChat.id,
        autoStart: true,
      };
    });

    // Start auto persona interview in the background
    waitUntil(
      runAutoPersonaInterview({
        sessionId: result.sessionId,
        userChatId: result.userChatId,
        projectBrief: project.brief,
        personaId: input.personaId,
      }).catch((error) => {
        rootLogger
          .child({ sessionId: result.sessionId })
          .error("Auto persona interview failed", { error: error.message });
      }),
    );

    return {
      success: true,
      data: {
        sessionId: result.sessionId,
        chatToken: result.chatToken,
        autoStart: result.autoStart,
      },
    };
  });
}

/**
 * Restart interview session chat
 */
export async function restartPersonaInterviewSession({
  projectId,
  sessionId,
}: {
  projectId: number;
  sessionId: number;
}): Promise<ServerActionResult<{ chatToken: string }>> {
  return withAuth(async (user) => {
    // Verify session ownership
    const session = await prisma.interviewSession.findUnique({
      where: {
        project: {
          userId: user.id,
        },
        projectId: projectId,
        id: sessionId,
      },
      include: {
        userChat: true,
        intervieweePersona: {
          select: { id: true, name: true },
        },
        project: {
          select: { brief: true },
        },
      },
    });

    if (!session) {
      return {
        success: false,
        code: "not_found",
        message: "Interview session not found",
      };
    }

    if (!session.intervieweePersonaId) {
      return {
        success: false,
        code: "not_found",
        message: "Interview session is not associated with an interviewee persona",
      };
    }

    if (!session.userChat) {
      return {
        success: false,
        code: "not_found",
        message: "User chat not found",
      };
    }

    const { userChat } = session;

    // Clear all existing chat messages
    await prisma.chatMessage.deleteMany({
      where: { userChatId: userChat.id },
    });

    // If it's a persona interview, restart auto conversation
    if (session.intervieweePersona) {
      waitUntil(
        runAutoPersonaInterview({
          sessionId: session.id,
          userChatId: userChat.id,
          projectBrief: session.project.brief,
          personaId: session.intervieweePersona.id,
        }).catch((error) => {
          rootLogger
            .child({ sessionId: session.id })
            .error("Auto persona interview restart failed", { error: error.message });
        }),
      );
    }

    return {
      success: true,
      data: { chatToken: userChat.token },
    };
  });
}

/**
 * Fetch interview session details
 */
export async function fetchInterviewSession({
  projectId,
  sessionId,
}: {
  projectId: number;
  sessionId: number;
}): Promise<ServerActionResult<InterviewSessionWithDetails>> {
  return withAuth(async (user) => {
    const session = await prisma.interviewSession.findUnique({
      where: {
        project: {
          userId: user.id,
        },
        projectId: projectId,
        id: sessionId,
      },
      include: {
        project: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        userChat: {
          select: { id: true, token: true, title: true },
        },
        intervieweeUser: {
          select: { id: true, name: true, email: true },
        },
        intervieweePersona: {
          select: { id: true, name: true, prompt: true },
        },
      },
    });

    if (!session) {
      return {
        success: false,
        code: "not_found",
        message: "Interview session not found",
      };
    }

    // Check access permission
    const hasAccess =
      session.project.userId === user.id || // Project owner
      session.intervieweeUserId === user.id; // Interviewee

    if (!hasAccess) {
      return {
        success: false,
        code: "forbidden",
        message: "Access denied",
      };
    }

    return {
      success: true,
      data: session as InterviewSessionWithDetails,
    };
  });
}

/**
 * Fetch interview session by chat token
 */
export async function fetchInterviewSessionByChatToken(
  chatToken: string,
): Promise<ServerActionResult<InterviewSessionWithDetails>> {
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: chatToken,
      kind: "interviewSession",
    },
    include: {
      interviewSession: {
        include: {
          project: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          intervieweeUser: {
            select: { id: true, name: true, email: true },
          },
          intervieweePersona: {
            select: { id: true, name: true, prompt: true },
          },
        },
      },
    },
  });

  if (!userChat?.interviewSession) {
    return {
      success: false,
      code: "not_found",
      message: "Interview session not found",
    };
  }

  const session = userChat.interviewSession;
  const sessionWithDetails: InterviewSessionWithDetails = {
    ...session,
    userChat: {
      id: userChat.id,
      token: userChat.token,
      title: userChat.title,
    },
    intervieweeUser: session.intervieweeUser,
    intervieweePersona: session.intervieweePersona,
  };

  return {
    success: true,
    data: sessionWithDetails,
  };
}

/**
 * Delete interview project
 */
export async function deleteInterviewProject(projectId: number): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProject.findUnique({
      where: { id: projectId, userId: user.id },
    });

    if (!project) {
      return {
        success: false,
        code: "not_found",
        message: "Interview project not found",
      };
    }

    await prisma.interviewProject.delete({
      where: { id: projectId },
    });

    return {
      success: true,
      data: undefined,
    };
  });
}

/**
 * Fetch available personas for interview
 */
export async function fetchAvailablePersonas({
  searchQuery,
  page = 1,
  pageSize = 12,
}: {
  searchQuery?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<
  ServerActionResult<
    Array<{ id: number; name: string; prompt: string; source: string; tags: string[] }>
  >
> {
  return withAuth(async (user) => {
    // Check if user is admin
    const adminUser = await prisma.adminUser.findUnique({
      where: { userId: user.id },
    });

    const isAdmin = !!adminUser;
    const skip = (page - 1) * pageSize;

    // If there's a search query, use vector search
    if (searchQuery && searchQuery.trim()) {
      try {
        const embedding = await createTextEmbedding(searchQuery, "retrieval.query");

        // Build the vector search query with user permissions
        const personas = isAdmin
          ? await prisma.$queryRaw<
              Array<{
                id: number;
                name: string;
                prompt: string;
                source: string;
                tags: unknown;
                tier: number;
              }>
            >`
              SELECT p.id, p.name, p.source, p.prompt, p.tags, p.tier
              FROM "Persona" p
              WHERE p."embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9
              ORDER BY p."embedding" <=> ${JSON.stringify(embedding)}::vector ASC
              LIMIT ${pageSize}
              OFFSET ${skip}
            `
          : await prisma.$queryRaw<
              Array<{
                id: number;
                name: string;
                prompt: string;
                source: string;
                tags: unknown;
                tier: number;
              }>
            >`
              SELECT p.id, p.name, p.source, p.prompt, p.tags, p.tier
              FROM "Persona" p
              WHERE p."embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9
              AND p."personaImportId" IN (SELECT id FROM "PersonaImport" WHERE "userId" = ${user.id})
              ORDER BY p."embedding" <=> ${JSON.stringify(embedding)}::vector ASC
              LIMIT ${pageSize}
              OFFSET ${skip}
            `;

        const totalCountResult = isAdmin
          ? await prisma.$queryRaw<{ count: number }[]>`
              SELECT COUNT(*) as count
              FROM "Persona" p
              WHERE p."embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9
            `
          : await prisma.$queryRaw<{ count: number }[]>`
              SELECT COUNT(*) as count
              FROM "Persona" p
              WHERE p."embedding" <=> ${JSON.stringify(embedding)}::vector < 0.9
              AND p."personaImportId" IN (SELECT id FROM "PersonaImport" WHERE "userId" = ${user.id})
            `;

        const totalCount = Math.min(40, Number(totalCountResult[0].count));

        return {
          success: true,
          data: personas.map((persona) => ({
            ...persona,
            tags: persona.tags as string[],
          })),
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
          },
        };
      } catch (error) {
        console.log(`Vector search error: ${(error as Error).message}`);
        return {
          success: false,
          message: "Persona search error",
        };
      }
    }

    // Regular search with user permissions
    const where = isAdmin
      ? {}
      : {
          personaImport: {
            userId: user.id,
          },
        };

    const [personas, totalCount] = await Promise.all([
      prisma.persona.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          source: true,
          prompt: true,
          tags: true,
          tier: true,
        },
        skip,
        take: pageSize,
      }),
      prisma.persona.count({ where }),
    ]);

    return {
      success: true,
      data: personas.map((persona) => ({
        ...persona,
        tags: persona.tags as string[],
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  });
}

/**
 * Generate interview report
 */
export async function generateInterviewReport(
  projectId: number,
): Promise<ServerActionResult<{ token: string }>> {
  return withAuth(async (user) => {
    // Verify project ownership
    const project = await prisma.interviewProject.findFirst({
      where: { id: projectId, userId: user.id },
      include: {
        sessions: {
          include: {
            userChat: {
              include: {
                messages: {
                  orderBy: { id: "asc" },
                },
              },
            },
            intervieweeUser: {
              select: { name: true, email: true },
            },
            intervieweePersona: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!project) {
      return {
        success: false,
        message: "Project not found or access denied",
      };
    }

    if (project.sessions.length === 0) {
      return {
        success: false,
        message: "No interview sessions found for this project",
      };
    }

    const reportToken = generateToken();

    // Create report record
    const report = await prisma.interviewReport.create({
      data: {
        projectId,
        token: reportToken,
        onePageHtml: "",
      },
    });

    // Generate report in background
    waitUntil(
      (async () => {
        try {
          await generateReportContent(project, report.id);
        } catch (error) {
          rootLogger.error(`Failed to generate interview report ${reportToken}:`, error);
        }
      })(),
    );

    return {
      success: true,
      data: { token: reportToken },
    };
  });
}

async function generateReportContent(
  project: InterviewProject & {
    sessions: {
      id: number;
      userChat: {
        id: number;
        messages: ChatMessage[];
      } | null;
      intervieweeUser: {
        name: string;
        email: string;
      } | null;
      intervieweePersona: {
        name: string;
      } | null;
    }[];
  },
  reportId: number,
): Promise<void> {
  const { llm, providerOptions } = await import("@/ai/provider");
  const { streamText } = await import("ai");
  const { interviewReportSystemPrompt, interviewReportPrologue } = await import("./prompt");
  const { getLocale } = await import("next-intl/server");

  const locale = await getLocale();

  // Prepare conversation data
  const conversations = project.sessions
    .filter((session) => (session.userChat?.messages?.length ?? 0) > 0)
    .map((session) => {
      const participantName =
        session.intervieweeUser?.name ||
        session.intervieweePersona?.name ||
        `Anonymous User ${session.id}`;
      const messages = (session.userChat?.messages ?? [])
        .filter((msg) => msg.content.trim() && !msg.content.includes("[READY]"))
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
          createdAt: msg.createdAt,
        }));

      return { participantName, messages };
    });

  let onePageHtml = "";

  const response = streamText({
    model: llm("claude-sonnet-4"),
    providerOptions: providerOptions,
    system: interviewReportSystemPrompt({ locale }),
    messages: [
      {
        role: "user",
        content: interviewReportPrologue({
          locale,
          projectBrief: project.brief,
          conversations,
        }),
      },
    ],
    maxSteps: 1,
    maxTokens: 30000,
    onChunk: async ({ chunk }) => {
      if (chunk.type === "text-delta") {
        onePageHtml += chunk.textDelta.toString();
        // Throttled save - save every 5 seconds
        await prisma.interviewReport.update({
          where: { id: reportId },
          data: { onePageHtml },
        });
      }
      rootLogger.info("Interview report generation progress");
    },
    onFinish: async () => {
      // Final save with completion timestamp
      await prisma.interviewReport.update({
        where: { id: reportId },
        data: {
          onePageHtml,
          generatedAt: new Date(),
        },
      });
    },
    onError: ({ error }) => {
      rootLogger.error(`Interview report generation error:`, error);
    },
  });

  await response.consumeStream();
}

/**
 * Fetch interview reports for a project
 */
export async function fetchInterviewReports(
  projectId: number,
): Promise<
  ServerActionResult<
    Array<{ id: number; token: string; generatedAt: Date | null; createdAt: Date }>
  >
> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProject.findFirst({
      where: { id: projectId, userId: user.id },
    });

    if (!project) {
      return {
        success: false,
        message: "Project not found or access denied",
      };
    }

    const reports = await prisma.interviewReport.findMany({
      where: { projectId },
      select: {
        id: true,
        token: true,
        generatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: reports,
    };
  });
}

/**
 * Delete interview report
 */
export async function deleteInterviewReport(reportId: number): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const report = await prisma.interviewReport.findFirst({
      where: {
        id: reportId,
        project: { userId: user.id },
      },
    });

    if (!report) {
      return {
        success: false,
        message: "Report not found or access denied",
      };
    }

    await prisma.interviewReport.delete({
      where: { id: reportId },
    });

    return {
      success: true,
      data: undefined,
    };
  });
}
