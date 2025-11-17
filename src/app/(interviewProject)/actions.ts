"use server";

import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import { generateToken } from "@/lib/utils";
import {
  ChatMessageAttachment,
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
import { z } from "zod/v3";
import { runAutoPersonaInterview } from "./(session)/api/chat/interview-agent/auto-persona";
import { generateInterviewReportContent } from "./artifacts/generateReport";
import { generateInterviewShareToken, validateInterviewShareToken } from "./lib";
import { processInterviewQuestionOptimization } from "./processing";
import { interviewProjectQuestionsSchema, Question, questionSchema } from "./tools/types";

/**
 * Create a snapshot of questions
 */
function createQuestionsSnapshot(questions: Question[]) {
  return questions.map((q) => ({
    text: q.text,
    image: q.image,
    questionType: q.questionType,
    options: q.options,
  }));
}

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
const createInterviewProjectSchema = z.object({
  brief: z
    .string()
    .min(10, "Brief must be at least 10 characters")
    .max(5000, "Brief must be less than 5000 characters"),
  presetQuestions: z.string().optional(),
  questionTypePreference: z
    .enum(["open-ended", "multiple-choice", "mixed"])
    .optional()
    .default("open-ended"),
});

export type CreateInterviewProjectInput = z.infer<typeof createInterviewProjectSchema>;

export async function createInterviewProject(
  input: CreateInterviewProjectInput,
): Promise<ServerActionResult<InterviewProject>> {
  const { brief, presetQuestions, questionTypePreference } =
    createInterviewProjectSchema.parse(input);
  const token = generateToken();
  return withAuth(async (user) => {
    const userId = user.id;

    // Parse preset questions into array
    const questions = presetQuestions
      ? presetQuestions
          .split("\n")
          .map((q) => q.trim())
          .filter((q) => q.length > 0)
          .map((text) => ({ text }))
      : [];

    const project = await prisma.interviewProject.create({
      data: {
        brief,
        userId,
        token,
        extra: {
          questionTypePreference,
          questions,
        },
      },
    });

    // Auto-generate questions if no preset questions provided
    if (!presetQuestions) {
      waitUntil(
        processInterviewQuestionOptimization(project.id).catch((error) => {
          rootLogger.error({
            msg: "Question optimization failed:",
            error: (error as Error).message,
          });
        }),
      );
    }

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
const updateInterviewProjectSchema = z.object({
  brief: z
    .string()
    .min(10, "Brief must be at least 10 characters")
    .max(5000, "Brief must be less than 5000 characters"),
  questionTypePreference: z.enum(["open-ended", "multiple-choice", "mixed"]).optional(),
});

export type UpdateInterviewProjectInput = z.infer<typeof updateInterviewProjectSchema>;

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
 * Only allowed when questions array is empty
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

    // Check if questions array is empty
    const extra = (project.extra as InterviewProjectExtra) || {};
    const questions = extra.questions || [];

    if (questions.length > 0) {
      return {
        success: false,
        code: "forbidden",
        message: "Cannot optimize questions when questions already exist",
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
 * Update a specific question in the project
 */
export async function updateInterviewQuestion(
  projectId: number,
  questionIndex: number,
  questionData: z.infer<typeof questionSchema>,
): Promise<ServerActionResult<InterviewProject>> {
  return withAuth(async (user) => {
    // Validate input data
    const validationResult = questionSchema.safeParse(questionData);
    if (!validationResult.success) {
      return {
        success: false,
        code: "internal_server_error",
        message: "Invalid question data: " + validationResult.error.message,
      };
    }

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

    // Validate and parse extra field
    const extraParseResult = interviewProjectQuestionsSchema.safeParse(project.extra || {});
    if (!extraParseResult.success) {
      rootLogger.error({
        msg: "Invalid project extra data structure",
        projectId,
        error: extraParseResult.error.message,
      });
      return {
        success: false,
        code: "internal_server_error",
        message: "Invalid project data structure",
      };
    }

    const extra = extraParseResult.data;
    const questions = extra.questions || [];

    if (questionIndex < 0 || questionIndex >= questions.length) {
      return {
        success: false,
        code: "not_found",
        message: "Question index out of range",
      };
    }

    // Update the question at the specified index
    questions[questionIndex] = validationResult.data;

    // Update the project with the modified questions array
    const updatedProject = await prisma.interviewProject.update({
      where: { id: projectId },
      data: {
        extra: {
          ...extra,
          questions,
        },
      },
    });

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
 * Delete a specific question from the project
 */
export async function deleteInterviewQuestion(
  projectId: number,
  questionIndex: number,
): Promise<ServerActionResult<InterviewProject>> {
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

    // Validate and parse extra field
    const extraParseResult = interviewProjectQuestionsSchema.safeParse(project.extra || {});
    if (!extraParseResult.success) {
      rootLogger.error({
        msg: "Invalid project extra data structure",
        projectId,
        error: extraParseResult.error.message,
      });
      return {
        success: false,
        code: "internal_server_error",
        message: "Invalid project data structure",
      };
    }

    const extra = extraParseResult.data;
    const questions = extra.questions || [];

    if (questionIndex < 0 || questionIndex >= questions.length) {
      return {
        success: false,
        code: "not_found",
        message: "Question index out of range",
      };
    }

    // Remove the question at the specified index
    questions.splice(questionIndex, 1);

    // Update the project with the modified questions array
    const updatedProject = await prisma.interviewProject.update({
      where: { id: projectId },
      data: {
        extra: {
          ...extra,
          questions,
        },
      },
    });

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
 * Create a new question for the project
 */
export async function createInterviewQuestion(
  projectId: number,
  questionData: z.infer<typeof questionSchema>,
): Promise<ServerActionResult<InterviewProject>> {
  return withAuth(async (user) => {
    // Validate input data
    const validationResult = questionSchema.safeParse(questionData);
    if (!validationResult.success) {
      return {
        success: false,
        code: "internal_server_error",
        message: "Invalid question data: " + validationResult.error.message,
      };
    }

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

    // Validate and parse extra field
    const extraParseResult = interviewProjectQuestionsSchema.safeParse(project.extra || {});
    if (!extraParseResult.success) {
      rootLogger.error({
        msg: "Invalid project extra data structure",
        projectId,
        error: extraParseResult.error.message,
      });
      return {
        success: false,
        code: "internal_server_error",
        message: "Invalid project data structure",
      };
    }

    const extra = extraParseResult.data;
    const questions = extra.questions || [];

    // Add the new question to the end of the array
    questions.push(validationResult.data);

    // Update the project with the modified questions array
    const updatedProject = await prisma.interviewProject.update({
      where: { id: projectId },
      data: {
        extra: {
          ...extra,
          questions,
        },
      },
    });

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
 * Generate temporary project share token with expiration
 */
export async function generateInterviewShareTokenAction(
  projectId: number,
  expiryHours: number = 24,
): Promise<ServerActionResult<{ shareToken: string; expiryHours: number }>> {
  return withAuth(async (user) => {
    // ensure project belongs to user
    const project = await prisma.interviewProject
      .findUniqueOrThrow({ where: { id: projectId, userId: user.id } })
      .catch(() => notFound());

    const shareToken = generateInterviewShareToken(project.id, expiryHours);
    return {
      success: true,
      data: {
        shareToken,
        expiryHours,
      },
    };
  });
}

/**
 * Generate permanent project share token
 */
export async function generatePermanentInterviewShareTokenAction(
  projectId: number,
): Promise<ServerActionResult<{ shareToken: string; permanent: true }>> {
  return withAuth(async (user) => {
    // ensure project belongs to user
    const project = await prisma.interviewProject
      .findUniqueOrThrow({ where: { id: projectId, userId: user.id } })
      .catch(() => notFound());

    // 获取或创建永久分享令牌
    const projectExtra = (project.extra as InterviewProjectExtra) || {};
    let permanentToken = projectExtra.permanentShareToken;

    if (!permanentToken) {
      // 生成新的永久令牌
      permanentToken = generateToken(); // 使用 generateToken 工具函数生成随机令牌

      // 使用原始SQL更新 extra 字段，确保不覆盖现有数据
      await prisma.$executeRaw`
        UPDATE "InterviewProject"
        SET "extra" = COALESCE("extra", '{}') || ${JSON.stringify({ permanentShareToken: permanentToken })}::jsonb,
            "updatedAt" = NOW()
        WHERE "id" = ${projectId}
      `;
    }

    // 生成永久链接
    const shareToken = generateInterviewShareToken(project.id, permanentToken);

    return {
      success: true,
      data: {
        shareToken,
        permanent: true,
      },
    };
  });
}

/**
 * Disable permanent invite link for a project
 */
export async function disablePermanentInviteLinkAction(
  projectId: number,
): Promise<ServerActionResult<{ success: boolean }>> {
  return withAuth(async (user) => {
    // ensure project belongs to user
    await prisma.interviewProject
      .findUniqueOrThrow({ where: { id: projectId, userId: user.id } })
      .catch(() => notFound());

    // 使用原始SQL从 extra 字段中移除 permanentShareToken
    await prisma.$executeRaw`
      UPDATE "InterviewProject"
      SET "extra" = "extra" - 'permanentShareToken',
          "updatedAt" = NOW()
      WHERE "id" = ${projectId}
    `;

    return {
      success: true,
      data: { success: true },
    };
  });
}

/**
 * Create persona interview session
 */
export async function createPersonaInterviewSession({
  projectId,
  personaToken,
}: {
  projectId: number;
  personaToken: string;
}): Promise<ServerActionResult<{ sessionId: number; chatToken: string }>> {
  return withAuth(async (user) => {
    const [project, persona] = await Promise.all([
      prisma.interviewProject
        .findUniqueOrThrow({ where: { id: projectId, userId: user.id } })
        .catch(() => notFound()),
      prisma.persona.findUniqueOrThrow({ where: { token: personaToken } }).catch(() => notFound()),
    ]);

    const userChat = await createUserChat({
      userId: user.id,
      kind: "interviewSession",
      title: "Persona Interview Session",
    });

    // Create questions snapshot with pre-generated form fields
    const projectExtra = (project.extra as InterviewProjectExtra) || {};
    const projectQuestions = projectExtra.questions || [];
    const questionsSnapshot = createQuestionsSnapshot(projectQuestions);

    const session = await prisma.interviewSession.create({
      data: {
        projectId: project.id,
        intervieweePersonaId: persona.id,
        userChatId: userChat.id,
        extra: {
          questions: questionsSnapshot,
        } as InterviewSessionExtra,
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
      const existingLang = (existingSession.extra as InterviewSessionExtra)?.preferredLanguage;

      // Update language preference if changed
      if (existingLang !== preferredLanguage) {
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

      // Always return existing session to avoid duplication
      return {
        success: true,
        data: {
          sessionId: existingSession.id,
          chatToken: existingSession.userChat.token,
        },
      };
    }

    // Fetch project to get questions for snapshot
    const project = await prisma.interviewProject.findUniqueOrThrow({
      where: { id: projectId },
    });

    const userChat = await createUserChat({
      userId: user.id,
      kind: "interviewSession",
      title: "Interview Session",
    });

    // Create questions snapshot with pre-generated form fields
    const projectExtra = (project.extra as InterviewProjectExtra) || {};
    const projectQuestions = projectExtra.questions || [];
    const questionsSnapshot = createQuestionsSnapshot(projectQuestions);

    const session = await prisma.interviewSession.create({
      data: {
        projectId,
        intervieweeUserId: user.id,
        userChatId: userChat.id,
        extra: {
          preferredLanguage,
          questions: questionsSnapshot,
        } as InterviewSessionExtra,
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
 * @param projectId - The project ID
 * @param includePersonaSessions - Whether to include AI Persona sessions. Default true (include all sessions).
 */
export async function generateInterviewReport(
  projectId: number,
  includePersonaSessions: boolean = true,
): Promise<
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

    // Get completed session IDs using raw SQL for efficient filtering
    // extra->>'ongoing' IS NULL 需要，如果 ongoing key 不存在，会导致 extra->>'ongoing' != 'true' 不成立
    const completedSessionIds = includePersonaSessions
      ? await prisma.$queryRaw<{ id: number }[]>`
          SELECT id FROM "InterviewSession"
          WHERE "projectId" = ${project.id}
          AND (extra->>'ongoing' IS NULL OR extra->>'ongoing' != 'true')
          AND title IS NOT NULL AND title != ''
        `
      : await prisma.$queryRaw<{ id: number }[]>`
          SELECT id FROM "InterviewSession"
          WHERE "projectId" = ${project.id}
          AND "intervieweeUserId" IS NOT NULL
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
 * Update interview session language preference
 * This will update the preferredLanguage in the session extra field
 */
export async function updateInterviewSessionLanguage({
  userChatToken,
  preferredLanguage,
}: {
  userChatToken: string;
  preferredLanguage: Locale;
}): Promise<ServerActionResult<{ success: boolean }>> {
  try {
    // First, fetch the session to verify access
    const sessionResult = await fetchInterviewSessionChat({ userChatToken });
    if (!sessionResult.success) {
      return {
        success: false,
        message: "Session not found or access denied",
        code: "not_found",
      };
    }

    const { interviewSessionId, extra: sessionExtra } = sessionResult.data;

    // Update the session's preferredLanguage
    await prisma.interviewSession.update({
      where: { id: interviewSessionId },
      data: {
        extra: {
          ...sessionExtra,
          preferredLanguage,
        },
      },
    });

    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    rootLogger.error({
      msg: "Failed to update interview session language",
      error: error instanceof Error ? error.message : String(error),
      userChatToken,
      preferredLanguage,
    });
    return {
      success: false,
      message: "Failed to update language preference",
      code: "internal_server_error",
    };
  }
}

/**
 * Get question data for selectQuestion tool
 * This is called by the client when AI invokes selectQuestion tool
 */
export async function getQuestionData({
  interviewSessionId,
  questionIndex,
}: {
  interviewSessionId: number;
  questionIndex: number;
}): Promise<
  ServerActionResult<{
    questionIndex: number;
    questionText: string;
    questionType: "open" | "single-choice" | "multiple-choice";
    options?: string[];
    image?: ChatMessageAttachment;
    formFields?: Array<{
      id: string;
      label: string;
      type: "text" | "choice" | "boolean";
      options?: string[];
      multipleChoice?: boolean;
    }>;
    optionsMetadata?: Array<{ text: string; endInterview?: boolean }>;
  }>
> {
  try {
    // Fetch session data
    const session = await prisma.interviewSession.findUnique({
      where: { id: interviewSessionId },
      select: { extra: true },
    });

    if (!session) {
      return {
        success: false,
        message: "Interview session not found",
        code: "not_found",
      };
    }

    const sessionExtra = (session.extra as InterviewSessionExtra) || {};
    const questions = sessionExtra.questions || [];

    // Validate index (convert from 1-based to 0-based)
    const arrayIndex = questionIndex - 1;
    if (arrayIndex < 0 || arrayIndex >= questions.length) {
      return {
        success: false,
        message: `Invalid question index ${questionIndex}. Valid range is 1 to ${questions.length}.`,
        code: "not_found",
      };
    }

    // Get the question
    const question = questions[arrayIndex] as {
      text: string;
      image?: ChatMessageAttachment;
      questionType?: "open" | "single-choice" | "multiple-choice";
      options?: Array<string | { text: string; endInterview?: boolean }>;
    };

    // Process options to separate text and metadata
    let optionsArray: string[] | undefined;
    let optionsMetadata: Array<{ text: string; endInterview?: boolean }> | undefined;

    if (question.options && question.options.length > 0) {
      optionsArray = [];
      optionsMetadata = [];

      for (const opt of question.options) {
        let text: string;
        let endInterview: boolean | undefined;

        if (typeof opt === "string") {
          text = opt;
          endInterview = undefined;
        } else {
          text = opt.text;
          endInterview = opt.endInterview;
        }

        // Clean display text by removing any [终止访谈] or [END INTERVIEW] markers
        const cleanText = text
          .replace(/\s*\[终止访谈\]\s*$/, "")
          .replace(/\s*\[END INTERVIEW\]\s*$/, "")
          .trim();

        optionsArray.push(cleanText);
        optionsMetadata.push({ text: cleanText, endInterview });
      }
    }

    // Generate formFields based on questionType
    const questionTypeValue = (question.questionType || "open") as
      | "open"
      | "single-choice"
      | "multiple-choice";
    let formFieldsArray:
      | Array<{
          id: string;
          label: string;
          type: "text" | "choice" | "boolean";
          options?: string[];
          multipleChoice?: boolean;
        }>
      | undefined;

    if (questionTypeValue === "open") {
      formFieldsArray = [
        {
          id: "answer",
          label: question.text,
          type: "text",
        },
      ];
    } else if (questionTypeValue === "single-choice" || questionTypeValue === "multiple-choice") {
      formFieldsArray = [
        {
          id: "answer",
          label: question.text,
          type: "choice",
          options: optionsArray,
          multipleChoice: questionTypeValue === "multiple-choice",
        },
      ];
    }

    return {
      success: true,
      data: {
        questionIndex,
        questionText: question.text,
        questionType: questionTypeValue,
        options: optionsArray,
        image: question.image as ChatMessageAttachment | undefined,
        formFields: formFieldsArray,
        optionsMetadata,
      },
    };
  } catch (error) {
    rootLogger.error({
      msg: "[getQuestionData] Error getting question data",
      error,
      interviewSessionId,
      questionIndex,
    });
    return {
      success: false,
      message: "Failed to get question data",
      code: "internal_server_error",
    };
  }
}
