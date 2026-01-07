"use server";

import { reorganizeMemoryContent } from "@/app/(memory)/lib/updateMemory";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

/**
 * Fetch all memory versions for a user or team.
 */
export async function fetchMemoryVersions({
  userId,
  teamId,
}: {
  userId?: number;
  teamId?: number;
}): Promise<
  ServerActionResult<
    {
      id: number;
      version: number;
      core: string;
      changeNotes: string;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  if (!userId && !teamId) {
    return {
      success: false,
      message: "Either userId or teamId must be provided",
    };
  }

  if (userId && teamId) {
    return {
      success: false,
      message: "Cannot provide both userId and teamId",
    };
  }

  const memories = await prisma.memory.findMany({
    where: userId ? { userId } : { teamId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      core: true,
      changeNotes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    success: true,
    data: memories,
  };
}

/**
 * Save a new memory version (admin edit).
 */
export async function saveMemoryVersion({
  userId,
  teamId,
  content,
  changeNotes,
}: {
  userId?: number;
  teamId?: number;
  content: string;
  changeNotes: string;
}): Promise<ServerActionResult<{ version: number }>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  if (!userId && !teamId) {
    return {
      success: false,
      message: "Either userId or teamId must be provided",
    };
  }

  if (userId && teamId) {
    return {
      success: false,
      message: "Cannot provide both userId and teamId",
    };
  }

  // Get latest version to determine next version number
  const latestMemory = await prisma.memory.findFirst({
    where: userId ? { userId } : { teamId },
    orderBy: { version: "desc" },
    take: 1,
    select: { version: true },
  });

  const nextVersion = (latestMemory?.version ?? 0) + 1;

  // Create new version
  await prisma.memory.create({
    data: {
      userId: userId ?? null,
      teamId: teamId ?? null,
      version: nextVersion,
      core: content,
      working: [],
      changeNotes: changeNotes || `Admin edit: saved as version ${nextVersion}`,
      extra: {},
    },
  });

  revalidatePath("/admin/memory");

  return {
    success: true,
    data: { version: nextVersion },
  };
}

/**
 * Reorganize memory content and save as new version.
 */
export async function reorganizeMemoryVersion({
  userId,
  teamId,
}: {
  userId?: number;
  teamId?: number;
}): Promise<ServerActionResult<{ version: number }>> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  if (!userId && !teamId) {
    return {
      success: false,
      message: "Either userId or teamId must be provided",
    };
  }

  if (userId && teamId) {
    return {
      success: false,
      message: "Cannot provide both userId and teamId",
    };
  }

  // Get latest memory version
  const latestMemory = await prisma.memory.findFirst({
    where: userId ? { userId } : { teamId },
    orderBy: { version: "desc" },
    take: 1,
  });

  if (!latestMemory) {
    return {
      success: false,
      message: "No memory found to reorganize",
    };
  }

  // Reorganize the content
  const reorganizedContent = await reorganizeMemoryContent(latestMemory.core, rootLogger);

  // Get next version number
  const nextVersion = latestMemory.version + 1;

  // Create new version with reorganized content
  await prisma.memory.create({
    data: {
      userId: userId ?? null,
      teamId: teamId ?? null,
      version: nextVersion,
      core: reorganizedContent,
      working: [],
      changeNotes: `Reorganized memory from ${latestMemory.core.length} to ${reorganizedContent.length} characters`,
      extra: {},
    },
  });

  revalidatePath("/admin/memory");

  return {
    success: true,
    data: { version: nextVersion },
  };
}
