import "server-only";

import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";
import { GameSessionExtra, GameTimeline, GameTimelineEvent } from "../types";

/**
 * Read the current timeline from DB. Used by human orchestration to re-sync
 * after server actions write events concurrently.
 */
export async function refreshTimeline(token: string): Promise<GameTimeline> {
  const row = await prisma.gameSession.findUnique({
    where: { token },
    select: { timeline: true },
  });
  return Array.isArray(row?.timeline) ? (row.timeline as GameTimeline) : [];
}

/**
 * Atomically append events to the timeline via SQL jsonb concatenation.
 * No read-modify-write cycle — safe for concurrent writers (server actions
 * writing alongside the orchestration loop).
 */
export async function appendTimelineEvents(
  token: string,
  events: GameTimelineEvent[],
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "GameSession"
    SET timeline = COALESCE(timeline, '[]'::jsonb) || ${JSON.stringify(events)}::jsonb,
        "updatedAt" = NOW()
    WHERE token = ${token}
  `;
}

export async function saveGameTimeline({
  token,
  timeline,
  status,
  extra,
  logger,
}: {
  token: string;
  timeline: GameTimeline;
  status?: string;
  extra?: GameSessionExtra;
  logger: Logger;
}): Promise<void> {
  try {
    await prisma.gameSession.update({
      where: { token },
      data: {
        timeline: timeline,
        ...(status ? { status } : {}),
        ...(extra ? { extra: extra as object } : {}),
      },
    });
  } catch (error) {
    logger.error({ msg: "Error saving game timeline", error: (error as Error).message });
    throw error;
  }
}
