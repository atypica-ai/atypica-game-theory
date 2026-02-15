"use server";

import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { isSystemMessage } from "@/ai/messageUtilsClient";
import { processInterviewQuestionOptimization } from "@/app/(interviewProject)/processing";
import { questionSchema } from "@/app/(interviewProject)/tools/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import {
  InterviewProject,
  InterviewProjectExtra,
  InterviewProjectQuestion,
  InterviewReportExtra,
  InterviewSessionExtra,
  UserChat,
} from "@/prisma/client";
import { InterviewSessionWhereInput } from "@/prisma/models";
import { prisma, prismaRO } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { isToolOrDynamicToolUIPart } from "ai";
import { notFound } from "next/navigation";
import { TInterviewMessageWithTool } from "../types";

/**
 * Update all interview questions (批量保存)
 * 用于替代单条操作，简化索引追踪逻辑
 */
export async function updateAllInterviewQuestions(
  projectId: number,
  questions: InterviewProjectQuestion[],
): Promise<ServerActionResult<InterviewProject>> {
  return withAuth(async (user) => {
    // Validate all questions
    const validationResults = questions.map((q) => questionSchema.safeParse(q));
    const firstError = validationResults.find((r) => !r.success);
    if (firstError && !firstError.success) {
      return {
        success: false,
        code: "internal_server_error",
        message: "Invalid question data: " + firstError.error.message,
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

    // Update all questions at once
    const updatedProject = await prisma.interviewProject.update({
      where: { id: projectId },
      data: { questions },
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
    const questions = (project.questions as InterviewProjectQuestion[]) || [];

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
    const { sessions } = await prismaRO.interviewProject
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
  filter = "all",
}: {
  projectToken: string;
  page?: number;
  pageSize?: number;
  filter?: "all" | "completed" | "incomplete";
}): Promise<
  ServerActionResult<
    Array<{
      id: number;
      title: string | null;
      createdAt: Date;
      extra: InterviewSessionExtra;
      stats: {
        rounds: number;
      };
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
    const project = await prismaRO.interviewProject.findUnique({
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

    // Use raw SQL to filter by extra.ongoing JSONB field with pagination
    let sessionIds: number[];
    let totalCount: number;

    if (filter === "completed") {
      // Get completed sessions (where extra.ongoing is false or null) - paginated
      const [countAndIds] = await Promise.all([
        prismaRO.$queryRaw<Array<{ id: number; total_count: bigint }>>`
          SELECT
            id,
            COUNT(*) OVER() as total_count
          FROM "InterviewSession"
          WHERE "projectId" = ${project.id}
            AND "userChatId" IS NOT NULL
            AND (extra->>'ongoing')::boolean = false
          ORDER BY "id" DESC
          LIMIT ${pageSize}
          OFFSET ${skip}
        `,
      ]);

      sessionIds = countAndIds.map((r) => r.id);
      totalCount = countAndIds.length > 0 ? Number(countAndIds[0].total_count) : 0;
    } else if (filter === "incomplete") {
      // Get incomplete sessions (where extra.ongoing is true) - paginated
      const [countAndIds] = await Promise.all([
        prismaRO.$queryRaw<Array<{ id: number; total_count: bigint }>>`
          SELECT
            id,
            COUNT(*) OVER() as total_count
          FROM "InterviewSession"
          WHERE "projectId" = ${project.id}
            AND "userChatId" IS NOT NULL
            AND (extra->>'ongoing')::boolean = true
          ORDER BY "id" DESC
          LIMIT ${pageSize}
          OFFSET ${skip}
        `,
      ]);

      sessionIds = countAndIds.map((r) => r.id);
      totalCount = countAndIds.length > 0 ? Number(countAndIds[0].total_count) : 0;
    } else {
      // Get all sessions
      const whereCondition = {
        projectId: project.id,
      } satisfies InterviewSessionWhereInput;

      const [sessions, count] = await Promise.all([
        prismaRO.interviewSession.findMany({
          where: whereCondition,
          select: { id: true },
          orderBy: { id: "desc" },
          skip,
          take: pageSize,
        }),
        prismaRO.interviewSession.count({ where: whereCondition }),
      ]);

      sessionIds = sessions.map((r) => r.id);
      totalCount = count;
    }

    // Fetch full session data for the filtered IDs, maintaining order
    const sessions =
      sessionIds.length > 0
        ? await prismaRO.interviewSession.findMany({
            where: { id: { in: sessionIds } },
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
                select: {
                  id: true,
                  token: true,
                  messages: filter === "incomplete" ? { orderBy: { id: "asc" } } : false,
                },
              },
              createdAt: true,
            },
          })
        : [];

    // Restore original order from sessionIds
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));
    const orderedSessions = sessionIds.map((id) => sessionMap.get(id)!).filter(Boolean);

    return {
      success: true,
      data: orderedSessions.map(({ extra, userChat: userChatOrNull, ...session }) => {
        let messages: TInterviewMessageWithTool[];
        let userChat: Pick<UserChat, "id" | "token"> | null;
        if (userChatOrNull) {
          userChat = { id: userChatOrNull.id, token: userChatOrNull.token };
          messages = !userChatOrNull.messages
            ? []
            : (userChatOrNull.messages.map(
                convertDBMessageToAIMessage,
              ) as TInterviewMessageWithTool[]);
        } else {
          messages = [];
          userChat = null;
        }
        const rounds = messages.reduce((acc, message) => {
          let parts = 0;
          if (message.role === "assistant") {
            parts = message.parts.filter(
              (part) =>
                (part.type === "text" && !isSystemMessage(part.text)) ||
                isToolOrDynamicToolUIPart(part),
            ).length;
          }
          return acc + parts;
        }, 0);
        return {
          stats: { rounds },
          userChat,
          extra: extra as InterviewSessionExtra,
          ...session,
        };
      }),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
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
    const project = await prismaRO.interviewProject
      .findUniqueOrThrow({
        // where: { id: projectId, userId: user.id },
        where: { token: projectToken },
      })
      .catch(() => notFound());
    const reports = await prismaRO.interviewReport.findMany({
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
      data: reports,
    };
  });
}
