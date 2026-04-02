import "server-only";

import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";
import { GameSessionExtra, GameTimeline } from "../types";

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
