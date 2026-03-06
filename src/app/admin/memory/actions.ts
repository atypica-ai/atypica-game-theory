"use server";

import { reorganizeMemoryWithCore } from "@/app/(memory)/lib/reorganizeMemory";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import type { Prisma } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

/**
 * Fetch all memories with user/team information and pagination support.
 */
export async function fetchAllMemories(
  page: number = 1,
  pageSize: number = 10,
  searchQuery?: string,
): Promise<
  ServerActionResult<
    {
      id: number;
      version: number;
      core: string;
      working: string[];
      changeNotes: string;
      createdAt: Date;
      updatedAt: Date;
      userId: number | null;
      teamId: number | null;
      userEmail: string | null;
      teamName: string | null;
    }[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_USERS]);

  const skip = (page - 1) * pageSize;

  // Build where condition
  const where: Prisma.MemoryWhereInput = {};

  // Add search condition if provided (search by user email or team name)
  if (searchQuery) {
    where.OR = [
      { user: { email: { contains: searchQuery } } },
      { team: { name: { contains: searchQuery } } },
    ];
  }

  const [memories, totalCount] = await Promise.all([
    prisma.memory.findMany({
      where,
      orderBy: [{ userId: "asc" }, { teamId: "asc" }, { version: "desc" }],
      skip,
      take: pageSize,
      select: {
        id: true,
        version: true,
        core: true,
        working: true,
        changeNotes: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        teamId: true,
        user: {
          select: {
            email: true,
          },
        },
        team: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.memory.count({ where }),
  ]);

  return {
    success: true,
    data: memories.map((m) => {
      const workingLines = Array.isArray(m.working) ? (m.working as string[]) : [];
      // 其实没必要但保险起见还是修复一下数据
      return {
        id: m.id,
        version: m.version,
        core: m.core,
        working: workingLines,
        changeNotes: m.changeNotes,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        userId: m.userId,
        teamId: m.teamId,
        userEmail: m.user?.email ?? null,
        teamName: m.team?.name ?? null,
      };
    }),
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

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
      working: true,
      changeNotes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    success: true,
    data: memories.map((m) => {
      const workingLines = Array.isArray(m.working) ? (m.working as string[]) : [];
      const content = workingLines.join("\n");
      return {
        id: m.id,
        version: m.version,
        core: m.core,
        working: content,
        changeNotes: m.changeNotes,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      };
    }),
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

  // Both personal and team: read from core + working, write updated core and clear working.
  const workingLines = Array.isArray(latestMemory.working) ? latestMemory.working : [];
  const currentContent = workingLines.join("\n");
  const currentCore = latestMemory.core ?? "";

  const newCore = await reorganizeMemoryWithCore(currentCore, currentContent, rootLogger);

  const nextVersion = latestMemory.version + 1;

  await prisma.memory.create({
    data: {
      userId: userId ?? null,
      teamId: teamId ?? null,
      version: nextVersion,
      core: newCore,
      working: [],
      changeNotes: `Admin reorganized: promoted permanent items to core, cleared working (core ${currentCore.length}→${newCore.length} chars, working ${currentContent.length} chars cleared)`,
      extra: {},
    },
  });

  revalidatePath("/admin/memory");

  return {
    success: true,
    data: { version: nextVersion },
  };
}
