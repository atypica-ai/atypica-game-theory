"use server";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { generateToken } from "@/lib/utils";
import withAuth from "@/lib/withAuth";
import {
  InterviewProject,
  InterviewSession,
  InterviewSessionKind,
  InterviewSessionStatus,
  UserChatKind,
} from "@prisma/client";
import { generateId, Message } from "ai";
import { revalidatePath } from "next/cache";

// Types for our frontend to use
export type InterviewProjectWithSessions = InterviewProject & {
  sessions: InterviewSession[];
};

// Create a new interview project
export async function createInterviewProject(data: {
  title: string;
  category: string;
}): Promise<ServerActionResult<InterviewProject>> {
  return withAuth(async (user) => {
    // Start a transaction to create project and chat together
    const result = await prisma.$transaction(async (tx) => {
      // Create the project with minimal fields
      const project = await tx.interviewProject.create({
        data: {
          userId: user.id,
          title: data.title,
          category: data.category,
          token: generateToken(),
          objectives: [], // 初始化为空数组
          brief: null, // 设置为空
        },
      });

      // Create a UserChat for the clarify session
      const userChat = await tx.userChat.create({
        data: {
          userId: user.id,
          title: `Clarify: ${project.title}`,
          kind: UserChatKind.interviewSession,
          token: generateToken(),
        },
      });

      // Add initial AI message
      const message = {
        id: generateId(),
        role: "assistant" as const,
        content:
          "Hello! I'm your interview expert. Let's refine your research project. Tell me about your research goals, and I'll help organize them into clear objectives and a project brief.",
      };

      await tx.chatMessage.create({
        data: {
          messageId: message.id,
          userChatId: userChat.id,
          role: message.role,
          content: message.content,
          parts: [{ type: "text", text: message.content }],
        },
      });

      // Create the clarify session
      await tx.interviewSession.create({
        data: {
          projectId: project.id,
          title: `Clarify: ${project.title}`,
          token: generateToken(),
          userChatId: userChat.id,
          kind: InterviewSessionKind.clarify,
          status: InterviewSessionStatus.active,
        },
      });

      return project;
    });

    revalidatePath("/interviewProject");

    return {
      success: true,
      data: result,
    };
  });
}

// Fetch all interview projects for the current user
export async function fetchInterviewProjects(): Promise<
  ServerActionResult<InterviewProjectWithSessions[]>
> {
  return withAuth(async (user) => {
    const projects = await prisma.interviewProject.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        sessions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return {
      success: true,
      data: projects,
    };
  });
}

// Fetch a specific interview project by token
export async function fetchInterviewProjectByToken(
  token: string,
): Promise<
  ServerActionResult<InterviewProjectWithSessions & { clarifySession?: InterviewSession }>
> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProject.findUnique({
      where: { token },
      include: {
        sessions: {
          orderBy: { createdAt: "desc" },
          include: {
            userChat: true,
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

    if (project.userId !== user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "You don't have access to this interview project",
      };
    }

    // Find the first clarify session (should only be one per project with the new design)
    const clarifySession = project.sessions.find((session) => session.kind === "clarify");

    return {
      success: true,
      data: {
        ...project,
        clarifySession,
      },
    };
  });
}

// Create a new clarify session
export async function createClarifySession(
  projectToken: string,
  title?: string,
): Promise<ServerActionResult<InterviewSession>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProject.findUnique({
      where: { token: projectToken },
    });

    if (!project) {
      return {
        success: false,
        code: "not_found",
        message: "Interview project not found",
      };
    }

    if (project.userId !== user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "You don't have access to this interview project",
      };
    }

    const sessionToken = generateToken();
    const message: Message = {
      id: generateId(),
      role: "assistant",
      content:
        "Hello! I'm your interview expert. How can I help you with this research project today?",
    };

    // Create a UserChat first for storing the conversation
    const userChat = await prisma.userChat.create({
      data: {
        userId: user.id,
        title: title || `Session for ${project.title}`,
        kind: UserChatKind.interviewSession,
        token: generateToken(),
      },
    });

    // Save the initial message
    await prisma.chatMessage.create({
      data: {
        messageId: message.id,
        userChatId: userChat.id,
        role: message.role,
        content: message.content,
        parts: [{ type: "text", text: message.content }],
      },
    });

    // Create the interview session
    const session = await prisma.interviewSession.create({
      data: {
        projectId: project.id,
        title: title || `Session ${new Date().toLocaleString()}`,
        token: sessionToken,
        userChatId: userChat.id,
        kind: InterviewSessionKind.clarify,
        status: InterviewSessionStatus.active,
      },
    });

    revalidatePath(`/interviewProject/${projectToken}`);

    return {
      success: true,
      data: session,
    };
  });
}

// Create a collect session session
export async function createCollectSession(
  projectToken: string,
  data: {
    title: string;
    notes?: string;
    expiresAt?: Date;
  },
): Promise<ServerActionResult<InterviewSession>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProject.findUnique({
      where: { token: projectToken },
    });

    if (!project) {
      return {
        success: false,
        code: "not_found",
        message: "Interview project not found",
      };
    }

    if (project.userId !== user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "You don't have access to this interview project",
      };
    }

    const sessionToken = generateToken();

    // Create the interview session
    const session = await prisma.interviewSession.create({
      data: {
        projectId: project.id,
        title: data.title,
        notes: data.notes,
        token: sessionToken,
        kind: InterviewSessionKind.collect,
        status: InterviewSessionStatus.pending, // No UserChat yet until someone uses it
        expiresAt: data.expiresAt,
      },
    });

    revalidatePath(`/interviewProject/${projectToken}`);

    return {
      success: true,
      data: session,
    };
  });
}

export async function fetchClarifyInterviewSession<
  T extends Omit<InterviewSession, "kind"> & {
    kind: "clarify";
    project: InterviewProject;
  },
>(sessionToken: string): Promise<ServerActionResult<T>> {
  return withAuth(async (user) => {
    const session = (await prisma.interviewSession.findUnique({
      where: {
        token: sessionToken,
        kind: "clarify",
      },
      include: {
        project: true,
      },
    })) as T | null;

    if (!session) {
      return {
        success: false,
        code: "not_found",
        message: "Interview session not found",
      };
    }

    if (session.project.userId !== user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "You don't have access to this interview session",
      };
    }

    return {
      success: true,
      data: session,
    };
  });
}
// Fetch a specific interview session
export async function fetchCollectInterviewSession<
  T extends Omit<InterviewSession, "kind"> & {
    kind: "collect";
    project: Pick<InterviewProject, "id" | "title" | "category" | "brief" | "objectives">;
  },
>(sessionToken: string): Promise<ServerActionResult<T>> {
  const interviewSession = (await prisma.interviewSession.findUnique({
    where: {
      token: sessionToken,
      kind: "collect",
    },
    include: {
      project: {
        select: {
          id: true,
          userId: true,
          title: true,
          category: true,
          brief: true,
          objectives: true,
        },
      },
    },
  })) as T | null;

  if (!interviewSession) {
    return {
      success: false,
      code: "not_found",
      message: "Interview session not found",
    };
  }

  return {
    success: true,
    data: interviewSession,
  };
}
