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
  InterviewSessionExtra,
  User,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { Locale } from "next-intl";
import { notFound } from "next/navigation";
import { z } from "zod/v3";
import { runAutoPersonaInterview } from "./(session)/api/chat/interview-agent/auto-persona";
import { generateInterviewReportContent } from "./artifacts/generateReport";
import { validateInterviewShareToken } from "./lib";
import { processInterviewQuestionOptimization } from "./processing";
import { QuestionData } from "./tools/types";

/**
 * Create a snapshot of questions (converts old format to new format)
 */
function createQuestionsSnapshot(
  questions: NonNullable<InterviewProjectExtra["questions"]>,
): QuestionData[] {
  return questions.map((q) => q);
  // return questions.map((q) => ({
  //   text: q.text,
  //   image: q.image,
  //   questionType: q.questionType,
  //   hint: q.hint,
  //   // Convert old format (string | {text, endInterview}) to new format (string)
  //   // options: q.options?.map((opt) => (typeof opt === "string" ? opt : opt.text)),
  //   options: q.options,
  // }));
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
});

export type CreateInterviewProjectInput = z.infer<typeof createInterviewProjectSchema>;

export async function createInterviewProject(
  input: CreateInterviewProjectInput,
): Promise<ServerActionResult<InterviewProject>> {
  const { brief, presetQuestions } = createInterviewProjectSchema.parse(input);
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
});

export type UpdateInterviewProjectInput = z.infer<typeof updateInterviewProjectSchema>;

export async function updateInterviewProject(
  projectId: number,
  input: UpdateInterviewProjectInput,
): Promise<ServerActionResult<InterviewProject>> {
  const { brief } = updateInterviewProjectSchema.parse(input);
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

    // Update brief only
    await prisma.interviewProject.update({
      where: { id: projectId },
      data: { brief },
    });

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
        userChatId: true,
      },
    });

    // Generate a unique token for this report
    const reportToken = generateToken();
    // Create the report record
    const report = await prisma.interviewReport.create({
      data: {
        token: reportToken,
        projectId,
        onePageHtml: "",
        extra: {
          sessions: sessions.map((s) => ({
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
          sessions: sessions
            .filter((s): s is typeof s & { userChatId: number } => s.userChatId !== null)
            .map((s) => ({
              id: s.id,
              title: s.title || "",
              userChatId: s.userChatId,
            })),
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
