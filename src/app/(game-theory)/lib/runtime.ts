import "server-only";

import { prisma } from "@/prisma/prisma";

/**
 * Atomically transitions a GameSession from "pending" → "running".
 * Uses a conditional SQL UPDATE so only one caller can win — any concurrent
 * duplicate trigger finds updatedRows = 0 and throws.
 */
export async function startGameSessionRun(token: string): Promise<void> {
  const updatedRows = await prisma.$executeRaw`
    UPDATE "GameSession"
    SET status = 'running', "updatedAt" = NOW()
    WHERE token = ${token} AND status = 'pending'
  `;
  if (updatedRows === 0) {
    throw new Error("Game session is already running or finished");
  }
}

/**
 * Marks a GameSession as completed. Clears any stale error field.
 */
export async function completeGameSessionRun(token: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "GameSession"
    SET status = 'completed',
        extra = COALESCE(extra, '{}'::jsonb) - 'error',
        "updatedAt" = NOW()
    WHERE token = ${token}
  `;
}

/**
 * Marks a GameSession as failed and records the error message.
 * Called from runGameSession's catch block for any error, including abort.
 */
export async function failGameSessionRun(token: string, error: Error | string): Promise<void> {
  const message = typeof error === "string" ? error : error.message;
  await prisma.$executeRaw`
    UPDATE "GameSession"
    SET status = 'failed',
        extra = jsonb_set(COALESCE(extra, '{}'::jsonb), '{error}', to_jsonb(${message}::text), true),
        "updatedAt" = NOW()
    WHERE token = ${token}
  `;
}

/**
 * Force-fails all GameSessions stuck in "running" status past a staleness threshold.
 * Call this before batch runs or from an admin utility to clean up crashed sessions.
 */
export async function cleanupStaleSessions(staleAfterMs = 2 * 60 * 60 * 1000): Promise<{
  cleaned: number;
  tokens: string[];
}> {
  const staleThreshold = new Date(Date.now() - staleAfterMs);

  const staleSessions = await prisma.gameSession.findMany({
    where: {
      status: "running",
      updatedAt: { lt: staleThreshold },
    },
    select: { token: true },
  });

  if (staleSessions.length === 0) {
    return { cleaned: 0, tokens: [] };
  }

  const tokens = staleSessions.map((s) => s.token);

  await prisma.$executeRaw`
    UPDATE "GameSession"
    SET status = 'failed',
        extra = jsonb_set(COALESCE(extra, '{}'::jsonb), '{error}', '"Session timed out (stale)"'::jsonb, true),
        "updatedAt" = NOW()
    WHERE token = ANY(${tokens}::text[])
      AND status = 'running'
  `;

  return { cleaned: tokens.length, tokens };
}
