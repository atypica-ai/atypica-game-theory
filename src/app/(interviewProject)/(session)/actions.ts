"use server";

import { persistentAIMessageToDB } from "@/ai/messageUtils";
import { ClientMessagePayload } from "@/ai/messageUtilsClient";
import { initInterviewProjectStatReporter } from "@/ai/tools/stats";
import { fetchInterviewSessionChat } from "@/app/(interviewProject)/actions";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import {
  InterviewProject,
  InterviewProjectExtra,
  InterviewSession,
  InterviewSessionExtra,
  Persona,
  User,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { generateId } from "ai";
import { Locale } from "next-intl";
import { runAutoPersonaInterview } from "./api/chat/interview-agent/auto-persona";
import { runHumanInterview } from "./api/chat/interview-agent/human";

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
 * Manually end human interview session
 */
export async function manuallyEndHumanInterviewSession({
  projectId,
  sessionId: interviewSessionId,
}: {
  projectId: number;
  sessionId: number;
}): Promise<ServerActionResult<void>> {
  return withAuth(async ({ id: userId }) => {
    // Verify session ownership
    const session = await prisma.interviewSession.findUnique({
      where: {
        project: { userId },
        projectId: projectId,
        id: interviewSessionId,
      },
      include: {
        userChat: { select: { id: true, token: true } },
        project: { select: { id: true, userId: true, brief: true, extra: true } },
      },
    });

    if (!session?.intervieweeUserId || !session?.userChat) {
      return {
        success: false,
        code: "not_found",
        message: "Interview session not found, or either interviewee user or user chat not found",
      };
    }

    const {
      project,
      userChat: { id: userChatId, token: userChatToken },
    } = session;
    const sessionExtra = session.extra as InterviewSessionExtra;

    const chatLogger = rootLogger.child({
      userChatId,
      userChatToken,
      interviewSessionId,
    });

    const { statReport } = initInterviewProjectStatReporter({
      userId, // ⚠️ 这里是 project owner 的 userId，不是正在被访谈的 userId
      interviewProjectId: project.id,
      sessionUserChatId: userChatId,
      logger: chatLogger,
    });

    const newMessage: ClientMessagePayload["message"] = {
      role: "user",
      parts: [{ type: "text", text: "[CONTINUE]" }],
    };
    const systemHint = "Please call endInterview tool immediately.";

    // Save the latest user message to database
    await persistentAIMessageToDB({
      userChatId,
      message: {
        ...newMessage,
        id: generateId(),
      },
    });

    const abortSignal = new AbortController().signal;

    waitUntil(
      runHumanInterview({
        statReport,
        logger: chatLogger,
        abortSignal,
        newMessage,
        systemHint,
        interviewSession: {
          interviewSessionId,
          extra: sessionExtra,
          userChatId,
          project: {
            brief: project.brief,
            extra: project.extra as InterviewProjectExtra,
          },
        },
      }),
    );

    return {
      success: true,
      data: undefined,
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
        extra: InterviewProjectExtra;
      };
      intervieweeUser: Pick<User, "id" | "name" | "email"> | null;
      intervieweePersona: Pick<Persona, "id" | "name"> | null;
      extra: InterviewSessionExtra;
      userChat: { id: number; token: string } | null;
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
        extra: true,
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
            extra: true,
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
      data: {
        ...session,
        extra: session.extra as InterviewSessionExtra,
        project: {
          ...session.project,
          extra: session.project.extra as InterviewProjectExtra,
        },
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
