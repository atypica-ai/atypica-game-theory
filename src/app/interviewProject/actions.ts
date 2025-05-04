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
  description: string;
  category: string;
  objectives: string[];
}): Promise<ServerActionResult<InterviewProject>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProject.create({
      data: {
        userId: user.id,
        title: data.title,
        description: data.description,
        category: data.category,
        objectives: data.objectives,
        token: generateToken(),
      },
    });

    revalidatePath("/interviewProject");

    return {
      success: true,
      data: project,
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
): Promise<ServerActionResult<InterviewProjectWithSessions>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProject.findUnique({
      where: { token },
      include: {
        sessions: {
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

    if (project.userId !== user.id) {
      return {
        success: false,
        code: "forbidden",
        message: "You don't have access to this interview project",
      };
    }

    return {
      success: true,
      data: project,
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
    description?: string;
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
        description: data.description,
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
    project: Pick<InterviewProject, "id" | "title" | "description" | "category" | "objectives">;
  },
>(sessionToken: string): Promise<ServerActionResult<T>> {
  return withAuth(async (user) => {
    const session = (await prisma.interviewSession.findUnique({
      where: {
        token: sessionToken,
        kind: "collect",
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            objectives: true,
          },
        },
      },
    })) as T | null;

    if (!session) {
      return {
        success: false,
        code: "not_found",
        message: "Interview session not found",
      };
    }

    return {
      success: true,
      data: session,
    };
  });
}
