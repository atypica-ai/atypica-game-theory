import "server-only";

import { prisma } from "@/prisma/prisma";

/**
 * Load latest user memory content. Returns empty string if memory doesn't exist.
 */
export async function loadUserMemory(userId: number): Promise<string> {
  const memory = await prisma.memory.findFirst({
    where: { userId },
    select: { core: true },
    orderBy: { version: "desc" },
    take: 1,
  });

  return memory?.core ?? "";
}

/**
 * Load latest team memory content. Returns empty string if memory doesn't exist.
 */
export async function loadTeamMemory(teamId: number): Promise<string> {
  const memory = await prisma.memory.findFirst({
    where: { teamId },
    select: { core: true },
    orderBy: { version: "desc" },
    take: 1,
  });

  return memory?.core ?? "";
}

/**
 * Load latest user memory with metadata.
 */
export async function loadUserMemoryWithMetadata(userId: number) {
  const memory = await prisma.memory.findFirst({
    where: { userId },
    orderBy: { version: "desc" },
    take: 1,
  });

  return memory;
}

/**
 * Load latest team memory with metadata.
 */
export async function loadTeamMemoryWithMetadata(teamId: number) {
  const memory = await prisma.memory.findFirst({
    where: { teamId },
    orderBy: { version: "desc" },
    take: 1,
  });

  return memory;
}
