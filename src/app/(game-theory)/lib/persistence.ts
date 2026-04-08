import "server-only";

import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";
import { GameSessionExtra, GameTimeline } from "../types";

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
