"use server";
import authOptions from "@/app/(auth)/authOptions";
import { loadUserMemoryWithMetadata } from "@/app/(memory)/lib/loadMemory";
import { updateMemory } from "@/app/(memory)/lib/updateMemory";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { ModelMessage } from "ai";
import { getServerSession } from "next-auth";

/**
 * Fetch current user's memory.
 */
export async function fetchUserMemory(): Promise<
  ServerActionResult<{
    core: string;
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

  return {
    success: true,
    data: {
      core: memory.core,
      version: memory.version,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
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
    rootLogger.error({ error, userId: session.user.id }, "Failed to update memory");
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update memory",
    };
  }
}
