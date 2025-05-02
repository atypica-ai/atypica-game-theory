"use server";

import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { generateToken } from "@/lib/utils";
import withAuth from "@/lib/withAuth";
import { InterviewExpertProject, InterviewSession } from "@prisma/client";
import { generateId, Message } from "ai";
import { revalidatePath } from "next/cache";

// Types for our frontend to use
export type InterviewExpertProjectWithSessions = InterviewExpertProject & {
  sessions: InterviewSession[];
};

// Create a new interview project
export async function createInterviewExpertProject(data: {
  title: string;
  description: string;
  type: string;
  objectives: string[];
}): Promise<ServerActionResult<InterviewExpertProject>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewExpertProject.create({
      data: {
        userId: user.id,
        title: data.title,
        description: data.description,
        type: data.type,
        objectives: data.objectives,
        token: generateToken(),
        status: "active",
      },
    });

    revalidatePath("/interviewExpert");

    return {
      success: true,
      data: project,
    };
  });
}

// Fetch all interview projects for the current user
export async function fetchInterviewExpertProjects(): Promise<
  ServerActionResult<InterviewExpertProjectWithSessions[]>
> {
  return withAuth(async (user) => {
    const projects = await prisma.interviewExpertProject.findMany({
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
export async function fetchInterviewExpertProjectByToken(
  token: string,
): Promise<ServerActionResult<InterviewExpertProjectWithSessions>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewExpertProject.findUnique({
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

// Create a new interview session
export async function createInterviewSession(
  projectToken: string,
  title?: string,
): Promise<ServerActionResult<InterviewSession>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewExpertProject.findUnique({
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
        kind: "interviewExpert",
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
        status: "active",
      },
    });

    revalidatePath(`/interviewExpert/${projectToken}`);

    return {
      success: true,
      data: session,
    };
  });
}

// Create a shareable interview session
export async function createShareableSession(
  projectToken: string,
  data: {
    title: string;
    description?: string;
    expiresAt?: Date;
  },
): Promise<ServerActionResult<InterviewSession>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewExpertProject.findUnique({
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
        type: "shareable",
        status: "pending", // No UserChat yet until someone uses it
        expiresAt: data.expiresAt,
      },
    });

    revalidatePath(`/interviewExpert/${projectToken}`);

    return {
      success: true,
      data: session,
    };
  });
}

// Fetch a specific interview session
export async function fetchInterviewSession(
  sessionToken: string,
): Promise<ServerActionResult<InterviewSession & { project: InterviewExpertProject }>> {
  return withAuth(async (user) => {
    const session = await prisma.interviewSession.findUnique({
      where: { token: sessionToken },
      include: {
        project: true,
      },
    });

    if (!session) {
      return {
        success: false,
        code: "not_found",
        message: "Interview session not found",
      };
    }

    if (session.project.userId !== user.id && session.type !== "shareable") {
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
