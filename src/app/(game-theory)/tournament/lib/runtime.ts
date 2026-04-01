import "server-only";

import { prisma } from "@/prisma/prisma";

/**
 * Atomically transitions a Tournament from "pending" → "running".
 * Throws if already running or finished.
 */
export async function startTournamentRun(token: string): Promise<void> {
  const updatedRows = await prisma.$executeRaw`
    UPDATE "Tournament"
    SET status = 'running', "updatedAt" = NOW()
    WHERE token = ${token} AND status = 'pending'
  `;
  if (updatedRows === 0) {
    throw new Error("Tournament is already running or finished");
  }
}

/**
 * Marks a Tournament as completed and clears any stale error field.
 */
export async function completeTournamentRun(token: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Tournament"
    SET status = 'completed',
        extra = COALESCE(extra, '{}'::jsonb) - 'error',
        "updatedAt" = NOW()
    WHERE token = ${token}
  `;
}

/**
 * Marks a Tournament as failed and records the error message in extra.error.
 */
export async function failTournamentRun(token: string, error: Error | string): Promise<void> {
  const message = typeof error === "string" ? error : error.message;
  await prisma.$executeRaw`
    UPDATE "Tournament"
    SET status = 'failed',
        extra = jsonb_set(COALESCE(extra, '{}'::jsonb), '{error}', to_jsonb(${message}::text), true),
        "updatedAt" = NOW()
    WHERE token = ${token}
  `;
}
