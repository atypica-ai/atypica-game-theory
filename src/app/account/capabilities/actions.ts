"use server";
import authOptions from "@/app/(auth)/authOptions";
import { loadUserMemoryWithMetadata } from "@/app/(memory)/lib/loadMemory";
import { updateMemory } from "@/app/(memory)/lib/updateMemory";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { ModelMessage } from "ai";
import { getServerSession } from "next-auth";

/**
 * Fetch current user's memory (core and working as separate strings for UI).
 */
export async function fetchUserMemory(): Promise<
  ServerActionResult<{
    core: string;
    working: string[];
    version: number;
    createdAt: Date;
    updatedAt: Date;
  } | null>
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  const memory = await loadUserMemoryWithMetadata(session.user.id);

  if (!memory) {
    return {
      success: true,
      data: null,
    };
  }

  const workingLines = Array.isArray(memory.working) ? (memory.working as string[]) : [];
  // 其实没必要但保险起见还是修复一下数据
  return {
    success: true,
    data: {
      core: memory.core,
      working: workingLines,
      version: memory.version,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
    },
  };
}

/**
 * Save user's core memory (direct edit). Creates a new version with content in core.
 */
export async function saveUserCoreMemory(
  content: string,
  changeNotes?: string,
): Promise<
  ServerActionResult<{
    core: string;
    working: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  const latestMemory = await prisma.memory.findFirst({
    where: { userId: session.user.id },
    orderBy: { version: "desc" },
    take: 1,
  });

  const nextVersion = (latestMemory?.version ?? 0) + 1;
  const working = latestMemory?.working ?? [];

  const newMemory = await prisma.memory.create({
    data: {
      userId: session.user.id,
      teamId: null,
      version: nextVersion,
      core: content,
      working: Array.isArray(working) ? working : [],
      changeNotes: changeNotes ?? `Manual update: core memory saved as version ${nextVersion}`,
      extra: {},
    },
  });

  const workingLines = Array.isArray(newMemory.working) ? (newMemory.working as string[]) : [];

  return {
    success: true,
    data: {
      core: newMemory.core,
      working: workingLines.join("\n"),
      version: newMemory.version,
      createdAt: newMemory.createdAt,
      updatedAt: newMemory.updatedAt,
    },
  };
}

/**
 * Update user memory based on their request.
 */
export async function requestMemoryUpdate(userRequest: string): Promise<ServerActionResult<void>> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      success: false,
      message: "Unauthorized",
    };
  }

  if (!userRequest.trim()) {
    return {
      success: false,
      message: "Request cannot be empty",
    };
  }

  try {
    // Create conversation context from user request
    const conversationContext: ModelMessage[] = [
      {
        role: "user",
        content: [{ type: "text", text: userRequest }],
      },
    ];

    await updateMemory({
      userId: session.user.id,
      conversationContext,
      logger: rootLogger.child({ userId: session.user.id }),
    });

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    rootLogger.error({
      msg: "Failed to update memory",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: session.user.id,
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update memory",
    };
  }
}
