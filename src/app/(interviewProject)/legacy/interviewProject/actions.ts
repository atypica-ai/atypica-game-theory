"use server";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import { generateToken } from "@/lib/utils";
import {
  InterviewProjectLegacy,
  InterviewSessionKind,
  InterviewSessionLegacy,
  InterviewSessionStatus,
  UserChatKind,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

// Types for our frontend to use
export type InterviewProjectWithSessions = InterviewProjectLegacy & {
  sessions: InterviewSessionLegacy[];
};

// Create a new interview project
export async function createInterviewProject(data: {
  title: string;
  category: string;
}): Promise<ServerActionResult<InterviewProjectLegacy>> {
  return withAuth(async (user) => {
    // Start a transaction to create project and chat together
    const result = await prisma.$transaction(async (tx) => {
      // Create the project with minimal fields
      const project = await tx.interviewProjectLegacy.create({
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
      const userChat = await createUserChat({
        userId: user.id,
        title: `Clarify: ${project.title}`,
        kind: UserChatKind.interviewSession,
        tx,
      });

      // Create the clarify session
      await tx.interviewSessionLegacy.create({
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
    const projects = await prisma.interviewProjectLegacy.findMany({
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
  ServerActionResult<InterviewProjectWithSessions & { clarifySession?: InterviewSessionLegacy }>
> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProjectLegacy.findUnique({
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

// Create a collect session session
export async function createCollectSession(
  projectToken: string,
  data: {
    title: string;
    notes?: string;
    expiresAt?: Date;
  },
): Promise<ServerActionResult<InterviewSessionLegacy>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProjectLegacy.findUnique({
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
    const session = await prisma.interviewSessionLegacy.create({
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

    revalidatePath(`/legacy/interviewProject/${projectToken}`);

    return {
      success: true,
      data: session,
    };
  });
}

export async function fetchClarifyInterviewSession<
  T extends Omit<InterviewSessionLegacy, "kind"> & {
    kind: "clarify";
    project: InterviewProjectLegacy;
  },
>(sessionToken: string): Promise<ServerActionResult<T>> {
  return withAuth(async (user) => {
    const session = (await prisma.interviewSessionLegacy.findUnique({
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
  T extends Omit<InterviewSessionLegacy, "kind"> & {
    kind: "collect";
    project: Pick<
      InterviewProjectLegacy,
      "id" | "title" | "category" | "brief" | "objectives" | "collectSystem"
    >;
  },
>(sessionToken: string): Promise<ServerActionResult<T>> {
  const interviewSession = (await prisma.interviewSessionLegacy.findUnique({
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
          collectSystem: true,
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

// Save digest to the database
export async function saveDigest(
  projectToken: string,
  digest: string,
): Promise<ServerActionResult<null>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProjectLegacy.findUnique({
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

    await prisma.interviewProjectLegacy.update({
      where: { token: projectToken },
      data: {
        digest,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/legacy/interviewProject/${projectToken}`);

    return {
      success: true,
      data: null,
    };
  });
}

// Update collect system prompt for the interview project
export async function updateCollectSystem(
  projectToken: string,
  collectSystem: string | null,
): Promise<ServerActionResult<null>> {
  return withAuth(async (user) => {
    const project = await prisma.interviewProjectLegacy.findUnique({
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

    await prisma.interviewProjectLegacy.update({
      where: { token: projectToken },
      data: {
        collectSystem: collectSystem || null,
        updatedAt: new Date(),
      },
    });

    revalidatePath(`/interviewProject/${projectToken}`);

    return {
      success: true,
      data: null,
    };
  });
}
