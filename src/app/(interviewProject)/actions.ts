"use server";
import { createTextEmbedding } from "@/ai/embedding";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import { InputJsonValue } from "@/prisma/client/runtime/library";
import { prisma } from "@/prisma/prisma";
import { generateId } from "ai";
import { getServerSession } from "next-auth";
import authOptions from "../(auth)/authOptions";
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
        token: generateId(),
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
    const shareUrl = `/projects/share/${shareToken}`;

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
): Promise<ServerActionResult<{ projectId: number; brief: string; ownerName: string | null }>> {
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
    include: {
      user: {
        select: { name: true },
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
      brief: project.brief,
      ownerName: project.user.name,
    },
  };
}

/**
 * Create interview session for human interviewee
 */
export async function createHumanInterviewSession(
  input: CreateHumanInterviewSessionInput,
): Promise<ServerActionResult<{ sessionId: number; chatToken: string }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      success: false,
      code: "unauthorized",
      message: "Authentication required",
    };
  }

  const userId = session.user.id;

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

      return { sessionId: interviewSession.id, chatToken: userChat.token, autoStart: true };
    });

    return {
      success: true,
      data: result,
    };
  });
}

/**
 * Fetch interview session details
 */
export async function fetchInterviewSession(
  sessionId: number,
): Promise<ServerActionResult<InterviewSessionWithDetails>> {
  return withAuth(async (user) => {
    const session = await prisma.interviewSession.findUnique({
      where: { id: sessionId },
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
export async function fetchInterviewSessionByToken(
  chatToken: string,
): Promise<ServerActionResult<InterviewSessionWithDetails>> {
  const userChat = await prisma.userChat.findUnique({
    where: { token: chatToken, kind: "interviewSession" },
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
    intervieweeUser: session.intervieweeUser || undefined,
    intervieweePersona: session.intervieweePersona || undefined,
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
