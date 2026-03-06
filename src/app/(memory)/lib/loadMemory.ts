import "server-only";

import { prisma } from "@/prisma/prisma";

/** Label for team memory block when combining with user memory. */
export const TEAM_MEMORY_LABEL = "Team Memory:\n";

/** Label for user personal memory block when combining with team memory. */
export const USER_PERSONAL_MEMORY_LABEL = "User Personal Memory:\n";

/**
 * Build concatenated memory string from core + working (for agent consumption).
 */
function concatCoreAndWorking(core: string | null | undefined, working: unknown): string {
  const corePart = (core ?? "").trim();
  const workingLines = Array.isArray(working) ? (working as string[]) : [];
  const workingPart = workingLines.join("\n").trim();
  const parts = [corePart, workingPart].filter((s) => s !== "");
  return parts.join("\n");
}

/**
 * Load latest user memory content. Returns core + working concatenated. Empty string if memory doesn't exist.
 */
export async function loadUserMemory(userId: number): Promise<string> {
  const memory = await prisma.memory.findFirst({
    where: { userId },
    select: { core: true, working: true },
    orderBy: { version: "desc" },
    take: 1,
  });

  return memory ? concatCoreAndWorking(memory.core, memory.working) : "";
}

/**
 * Load latest team memory content. Returns core + working concatenated. Empty string if memory doesn't exist.
 */
export async function loadTeamMemory(teamId: number): Promise<string> {
  const memory = await prisma.memory.findFirst({
    where: { teamId },
    select: { core: true, working: true },
    orderBy: { version: "desc" },
    take: 1,
  });

  return memory ? memory.core : ""; // Team does not involve working memory yet.
}

/**
 * Load memory for agent context: when user has both team and personal memory, returns both with clear labels.
 * - Team block (if teamId and team has memory): "Team Memory:\n" + team core+working.
 * - User block (if user has memory): "User's Personal Memory:\n" + user core+working.
 * Order: team first, then user. Empty sections are omitted.
 */
export async function loadMemoryForAgent(userId: number, teamId?: number | null): Promise<string> {
  const [teamContent, userContent] = await Promise.all([
    teamId ? loadTeamMemory(teamId) : Promise.resolve(""),
    loadUserMemory(userId),
  ]);

  const parts: string[] = [];
  if (teamContent) parts.push(TEAM_MEMORY_LABEL + teamContent);
  if (userContent) parts.push(USER_PERSONAL_MEMORY_LABEL + userContent);
  return parts.join("\n\n---\n\n");
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
