"use server";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import { generateToken } from "@/lib/utils";
import {
  InterviewProject,
  InterviewProjectExtra,
  InterviewReportExtra,
  InterviewSession,
  InterviewSessionExtra,
  Persona,
  User,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { Locale } from "next-intl";
import { notFound } from "next/navigation";
import { runAutoPersonaInterview } from "./(session)/api/chat/interview-agent/auto-persona";
import { generateInterviewReportContent } from "./artifacts/generateReport";
import {
  extractInterviewTranscript,
  generateInterviewShareToken,
  generateTranscriptMarkdown,
  validateInterviewShareToken,
} from "./lib";
import { processInterviewQuestionOptimization } from "./processing";
import {
  CreateInterviewProjectInput,
  createInterviewProjectSchema,
  UpdateInterviewProjectInput,
  updateInterviewProjectSchema,
} from "./types";

/**
 * Fetch user's interview projects
 */
export async function fetchUserInterviewProjects(): Promise<
  ServerActionResult<
    (InterviewProject & {
      sessionStats: {
        humanSessions: number;
        personaSessions: number;
        total: number;
      };
    })[]
  >
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
      data: projects.map(({ sessions, extra, ...project }) => {
        const humanSessions = sessions.filter((s) => s.intervieweeUserId).length;
        const personaSessions = sessions.filter((s) => s.intervieweePersonaId).length;
        return {
          ...project,
          extra: extra as InterviewProjectExtra,
          sessionStats: {
            humanSessions,
            personaSessions,
            total: sessions.length,
          },
        };
      }),
    };
  });
}

/**
 * Create a new interview project
 */
export async function createInterviewProject(
  input: CreateInterviewProjectInput,
): Promise<ServerActionResult<InterviewProject>> {
  const { brief, questionTypePreference } = createInterviewProjectSchema.parse(input);
  const token = generateToken();
  return withAuth(async (user) => {
    const userId = user.id;
    const project = await prisma.interviewProject.create({
      data: {
        brief,
        userId,
        token,
        extra: questionTypePreference ? { questionTypePreference } : {},
      },
    });

    // Start question optimization in background
    waitUntil(
      processInterviewQuestionOptimization(project.id).catch((error) => {
        rootLogger.error({ msg: "Question optimization failed:", error: (error as Error).message });
      }),
    );

    return {
      success: true,
      data: {
        ...project,
        extra: project.extra as InterviewProjectExtra,
      },
    };
  });
}

/**
 * Update interview project brief
 */
export async function updateInterviewProject(
  projectId: number,
  input: UpdateInterviewProjectInput,
): Promise<ServerActionResult<InterviewProject>> {
  const { brief, questionTypePreference } = updateInterviewProjectSchema.parse(input);
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

    // Use rawSQL to update brief and questionTypePreference atomically
    const extraUpdate = questionTypePreference ? { questionTypePreference } : {};
    await prisma.$executeRaw`
      UPDATE "InterviewProject"
      SET "brief" = ${brief},
          "extra" = COALESCE("extra", '{}') || ${JSON.stringify(extraUpdate)}::jsonb,
          "updatedAt" = NOW()
      WHERE "id" = ${projectId}
    `;

    const updatedProject = await prisma.interviewProject.findUniqueOrThrow({
      where: { id: projectId },
    });

    // Start question optimization in background after brief update
    waitUntil(
      processInterviewQuestionOptimization(projectId).catch((error) => {
        rootLogger.error({ msg: "Question optimization failed:", error: (error as Error).message });
      }),
    );

    return {
      success: true,
      data: {
        ...updatedProject,
        extra: updatedProject.extra as InterviewProjectExtra,
      },
    };
  });
}

/**
 * Manually trigger question optimization
 */
export async function optimizeInterviewQuestions(
  projectId: number,
): Promise<ServerActionResult<void>> {
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

    // Start question optimization in background
    waitUntil(
      processInterviewQuestionOptimization(projectId).catch((error) => {
        rootLogger.error({ msg: "Question optimization failed:", error: (error as Error).message });
      }),
    );

    return {
      success: true,
      data: undefined,
    };
  });
}

/**
 * Fetch session statistics for a project
 */
export async function fetchInterviewSessionStatsByProjectToken({
  projectToken,
}: {
  projectToken: string;
}): Promise<
  ServerActionResult<{
    total: number;
    completed: number;
    incomplete: number;
    humanSessions: {
      total: number;
      completed: number;
      incomplete: number;
    };
    personaSessions: {
      total: number;
      completed: number;
      incomplete: number;
    };
  }>
> {
  return withAuth(async () => {
    const { sessions } = await prisma.interviewProject
      .findUniqueOrThrow({
        // where: { id: projectId, userId: user.id },
        where: { token: projectToken },
        select: {
          id: true,
          sessions: {
            select: {
              id: true,
              title: true,
              extra: true,
              intervieweeUserId: true,
              intervieweePersonaId: true,
            },
          },
        },
      })
      .catch(() => notFound());

    const total = sessions.length;
    const completed = sessions.filter((s) => !(s.extra as InterviewSessionExtra)?.ongoing).length;
    const incomplete = total - completed;

    const humanSessions = sessions.filter((s) => s.intervieweeUserId);
    const humanCompleted = humanSessions.filter(
      (s) => !(s.extra as InterviewSessionExtra)?.ongoing,
    ).length;
    const humanIncomplete = humanSessions.length - humanCompleted;

    const personaSessions = sessions.filter((s) => s.intervieweePersonaId);
    const personaCompleted = personaSessions.filter(
      (s) => !(s.extra as InterviewSessionExtra)?.ongoing,
    ).length;
    const personaIncomplete = personaSessions.length - personaCompleted;

    return {
      success: true,
      data: {
        total,
        completed,
        incomplete,
        humanSessions: {
          total: humanSessions.length,
          completed: humanCompleted,
          incomplete: humanIncomplete,
        },
        personaSessions: {
          total: personaSessions.length,
          completed: personaCompleted,
          incomplete: personaIncomplete,
        },
      },
    };
  });
}

/**
 * Fetch interview sessions for a project
 */
export async function fetchInterviewSessionsByProjectToken({
  projectToken,
  page = 1,
  pageSize = 10,
}: {
  projectToken: string;
  page?: number;
  pageSize?: number;
}): Promise<
  ServerActionResult<
    Array<{
      id: number;
      title: string | null;
      createdAt: Date;
      extra: InterviewSessionExtra;
      userChat: {
        id: number;
        token: string;
      } | null;
      intervieweeUser: {
        id: number;
        name: string;
        email: string | null;
      } | null;
      intervieweePersona: {
        id: number;
        name: string;
      } | null;
    }>
  >
> {
  return withAuth(async () => {
    // First verify the project belongs to the user
    const project = await prisma.interviewProject.findUnique({
      // where: { id: projectId, userId: user.id },
      where: { token: projectToken },
      select: { id: true },
    });

    if (!project) {
      return {
        success: false,
        code: "not_found",
        message: "Interview project not found",
      };
    }

    const skip = (page - 1) * pageSize;
    const whereCondition = { projectId: project.id };

    const [sessions, totalCount] = await Promise.all([
      prisma.interviewSession.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          extra: true,
          intervieweeUser: {
            select: { id: true, name: true, email: true },
          },
          intervieweePersona: {
            select: { id: true, name: true },
          },
          userChat: {
            select: { id: true, token: true },
          },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.interviewSession.count({ where: whereCondition }),
    ]);

    return {
      success: true,
      data: sessions.map(({ extra, ...session }) => ({
        extra: extra as InterviewSessionExtra,
        ...session,
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
 * Generate project share token
 */
export async function generateInterviewShareTokenAction(
  projectId: number,
  expiryHours: number = 24,
): Promise<ServerActionResult<{ shareToken: string }>> {
  return withAuth(async (user) => {
    // ensure project belongs to user
    const project = await prisma.interviewProject
      .findUniqueOrThrow({ where: { id: projectId, userId: user.id } })
      .catch(() => notFound());
    const shareToken = generateInterviewShareToken(project.id, expiryHours);
    return {
      success: true,
      data: { shareToken },
    };
  });
}

/**
 * Create persona interview session
 */
export async function createPersonaInterviewSession({
  projectId,
  personaId,
}: {
  projectId: number;
  personaId: number;
}): Promise<ServerActionResult<{ sessionId: number; chatToken: string }>> {
  return withAuth(async (user) => {
    const [project, persona] = await Promise.all([
      prisma.interviewProject
        .findUniqueOrThrow({ where: { id: projectId, userId: user.id } })
        .catch(() => notFound()),
      prisma.persona.findUniqueOrThrow({ where: { id: personaId } }).catch(() => notFound()),
    ]);

    const userChat = await createUserChat({
      userId: user.id,
      kind: "interviewSession",
      title: "Persona Interview Session",
    });

    const session = await prisma.interviewSession.create({
      data: {
        projectId: project.id,
        intervieweePersonaId: persona.id,
        userChatId: userChat.id,
      },
    });

    // Auto-run the persona interview in the background
    waitUntil(
      runAutoPersonaInterview({
        sessionId: session.id,
        userChatId: userChat.id,
        project: {
          id: project.id,
          brief: project.brief,
          userId: project.userId,
          extra: project.extra as InterviewProjectExtra,
        },
        personaId: persona.id,
      }),
    );

    return {
      success: true,
      data: {
        sessionId: session.id,
        chatToken: userChat.token,
      },
    };
  });
}

/**
 * Create human interview session
 */
export async function createHumanInterviewSession({
  // projectId,
  shareToken,
  preferredLanguage,
}: {
  // projectId: number;
  shareToken: string;
  preferredLanguage: Locale;
}): Promise<ServerActionResult<{ sessionId: number; chatToken: string }>> {
  return withAuth(async (user) => {
    const tokenValidation = await validateInterviewShareToken(shareToken);
    if (!tokenValidation) {
      return {
        success: false,
        message: "Invalid share token",
      };
    }
    const { projectId } = tokenValidation;

    // Check if user has already created a session for this project
    const existingSession = await prisma.interviewSession.findFirst({
      where: { projectId, intervieweeUserId: user.id },
      select: {
        id: true,
        userChat: { select: { id: true, token: true } },
        extra: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingSession?.userChat) {
      if (
        (existingSession.extra as InterviewSessionExtra)?.preferredLanguage !== preferredLanguage
      ) {
        await prisma.interviewSession.update({
          where: { id: existingSession.id },
          data: {
            extra: {
              ...(existingSession.extra as InterviewSessionExtra),
              preferredLanguage,
            },
          },
        });
      }
      return {
        success: true,
        data: {
          sessionId: existingSession.id,
          chatToken: existingSession.userChat.token,
        },
      };
    }

    const userChat = await createUserChat({
      userId: user.id,
      kind: "interviewSession",
      title: "Interview Session",
    });

    const session = await prisma.interviewSession.create({
      data: {
        projectId,
        intervieweeUserId: user.id,
        userChatId: userChat.id,
        extra: { preferredLanguage } as InterviewSessionExtra,
      },
    });

    return {
      success: true,
      data: {
        sessionId: session.id,
        chatToken: userChat.token,
      },
    };
  });
}

export async function deleteInterviewSessionAction(sessionId: number) {
  return withAuth(async (user) => {
    await prisma.interviewSession.delete({
      where: {
        project: { userId: user.id }, // 确保删除的 session 属于当前用户
        id: sessionId,
      },
    });
  });
}

/**
 * Restart persona interview session
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
        project: { userId: user.id },
        projectId: projectId,
        id: sessionId,
      },
      include: {
        userChat: { select: { id: true, token: true } },
        project: { select: { id: true, userId: true, brief: true, extra: true } },
      },
    });

    if (!session?.intervieweePersonaId || !session?.userChat) {
      return {
        success: false,
        code: "not_found",
        message:
          "Interview session not found, or either interviewee persona or user chat not found",
      };
    }

    const { project, intervieweePersonaId, userChat } = session;

    // Clear all existing chat messages
    await prisma.chatMessage.deleteMany({
      where: { userChatId: userChat.id },
    });

    // If it's a persona interview, restart auto conversation
    waitUntil(
      runAutoPersonaInterview({
        sessionId,
        userChatId: userChat.id,
        project: {
          id: project.id,
          brief: project.brief,
          userId: project.userId,
          extra: project.extra as InterviewProjectExtra,
        },
        personaId: intervieweePersonaId,
      }),
    );

    return {
      success: true,
      data: {
        chatToken: userChat.token,
      },
    };
  });
}

/**
 * Fetch interview session by userChat's token associated with the session
 * ⚠️ This action requires authentication and authorization to access the session details.
 */
export async function fetchInterviewSessionDetails({
  userChatToken,
}: {
  userChatToken: string;
}): Promise<
  ServerActionResult<
    Pick<InterviewSession, "id" | "projectId" | "title" | "userChatId"> & {
      project: Pick<InterviewProject, "id" | "brief"> & {
        user: Pick<User, "id" | "name" | "email">;
      };
      intervieweeUser: Pick<User, "id" | "name" | "email"> | null;
      intervieweePersona: Pick<Persona, "id" | "name"> | null;
    }
  >
> {
  return withAuth(async (user) => {
    const sessions = await prisma.interviewSession.findMany({
      where: {
        project: { userId: user.id },
        userChat: { token: userChatToken },
      },
      select: {
        id: true,
        projectId: true,
        title: true,
        userChatId: true,
        userChat: {
          select: {
            id: true,
            token: true,
          },
        },
        project: {
          select: {
            id: true,
            brief: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        intervieweeUser: {
          select: { id: true, name: true, email: true },
        },
        intervieweePersona: {
          select: { id: true, name: true },
        },
      },
    });

    if (!sessions.length) {
      return {
        success: false,
        code: "not_found",
        message: "Interview session not found",
      };
    }

    const session = sessions[0];

    return {
      success: true,
      data: session,
    };
  });
}

/**
 * Fetch interview session by chat token
 */
export async function fetchInterviewSessionChat({
  userChatToken,
}: {
  userChatToken: string;
}): Promise<
  ServerActionResult<{
    interviewSessionId: number;
    project: Pick<InterviewProject, "id" | "brief"> & {
      user: Pick<User, "id" | "name" | "email">;
      extra: InterviewProjectExtra;
    };
    userChatId: number;
    intervieweeUser: Pick<User, "id" | "name" | "email">;
    extra: InterviewSessionExtra;
  }>
> {
  return withAuth(async (user) => {
    const userChat = await prisma.userChat.findUnique({
      where: {
        token: userChatToken,
        kind: "interviewSession",
      },
      select: {
        id: true,
        interviewSession: {
          select: {
            id: true,
            extra: true,
            project: {
              select: {
                id: true,
                brief: true,
                extra: true,
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
            intervieweeUser: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!userChat?.interviewSession || !userChat.interviewSession.intervieweeUser) {
      return {
        success: false,
        code: "not_found",
        message: "Interview session not found",
      };
    }

    const session = userChat.interviewSession;
    if (session.intervieweeUser?.id !== user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "Interview session does not belong to user",
      };
    }

    return {
      success: true,
      data: {
        interviewSessionId: session.id,
        project: {
          ...session.project,
          extra: session.project.extra as InterviewProjectExtra,
        },
        userChatId: userChat.id,
        intervieweeUser: session.intervieweeUser,
        extra: session.extra as InterviewSessionExtra,
      },
    };
  });
}

/**
 * Fetch interview reports for a project
 */
export async function fetchInterviewReportsByProjectToken({
  projectToken,
}: {
  projectToken: string;
}): Promise<
  ServerActionResult<
    Array<{
      id: number;
      token: string;
      generatedAt: Date | null;
      createdAt: Date;
      extra: InterviewReportExtra;
    }>
  >
> {
  return withAuth(async () => {
    // Ensure project belongs to user
    const project = await prisma.interviewProject
      .findUniqueOrThrow({
        // where: { id: projectId, userId: user.id },
        where: { token: projectToken },
      })
      .catch(() => notFound());
    const reports = await prisma.interviewReport.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        id: true,
        token: true,
        generatedAt: true,
        createdAt: true,
        extra: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      success: true,
      data: reports.map(({ extra, ...report }) => ({
        ...report,
        extra: extra as InterviewReportExtra,
      })),
    };
  });
}

/**
 * Generate interview report
 */
export async function generateInterviewReport(projectId: number): Promise<
  ServerActionResult<{
    id: number;
    token: string;
    generatedAt: Date | null;
    extra: InterviewReportExtra;
    createdAt: Date;
  }>
> {
  return withAuth(async (user) => {
    // Verify project ownership
    const project = await prisma.interviewProject
      .findUniqueOrThrow({
        where: { id: projectId, userId: user.id },
        select: { id: true, userId: true, brief: true },
      })
      .catch(() => notFound());

    // First get completed session IDs using raw SQL for efficient filtering
    // extra->>'ongoing' IS NULL 需要，如果 ongoing key 不存在，会导致 extra->>'ongoing' != 'true' 不成立
    const completedSessionIds = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM "InterviewSession"
      WHERE "projectId" = ${project.id}
      AND (extra->>'ongoing' IS NULL OR extra->>'ongoing' != 'true')
      AND title IS NOT NULL AND title != ''
    `;

    const sessions = await prisma.interviewSession.findMany({
      where: {
        id: { in: completedSessionIds.map((s) => s.id) },
      },
      select: {
        id: true,
        title: true,
        userChat: {
          select: {
            messages: {
              select: {
                role: true,
                content: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    // Filter sessions to ensure userChat is not null
    const filteredSessions = sessions.filter(
      (session): session is typeof session & { userChat: NonNullable<typeof session.userChat> } =>
        session.userChat !== null,
    );

    // Generate a unique token for this report
    const reportToken = generateToken();
    // Create the report record
    const report = await prisma.interviewReport.create({
      data: {
        token: reportToken,
        projectId,
        onePageHtml: "",
        extra: {
          sessions: filteredSessions.map((s) => ({
            id: s.id,
            title: s.title || "",
          })),
        } as InterviewReportExtra,
      },
    });

    // Generate report content in the background
    waitUntil(
      generateInterviewReportContent({
        report: {
          id: report.id,
          token: report.token,
        },
        project: {
          id: project.id,
          userId: project.userId,
          brief: project.brief,
          sessions: filteredSessions,
        },
      }),
    );

    return {
      success: true,
      data: {
        id: report.id,
        token: report.token,
        extra: report.extra as InterviewReportExtra,
        generatedAt: null,
        createdAt: report.createdAt,
      },
    };
  });
}

/**
 * Get interview transcript as markdown
 * 暂时没用了
 */
export async function getInterviewTranscriptMarkdown(
  sessionId: number,
): Promise<ServerActionResult<string>> {
  return withAuth(async (user) => {
    // Verify session ownership and get userChatId
    const session = await prisma.interviewSession.findUnique({
      where: {
        id: sessionId,
        project: { userId: user.id },
      },
      select: {
        userChatId: true,
      },
    });

    if (!session || !session.userChatId) {
      return {
        success: false,
        code: "not_found",
        message: "Interview session not found or chat not found",
      };
    }

    try {
      const transcript = await extractInterviewTranscript(session.userChatId);
      const markdown = generateTranscriptMarkdown(transcript);

      return {
        success: true,
        data: markdown,
      };
    } catch {
      return {
        success: false,
        code: "internal_server_error",
        message: "Failed to extract transcript",
      };
    }
  });
}
