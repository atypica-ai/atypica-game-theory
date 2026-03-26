import "server-only";

import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";
import { GameSessionTimeline } from "../types";

export async function saveGameTimeline({
  token,
  timeline,
  status,
  logger,
}: {
  token: string;
  timeline: GameSessionTimeline;
  status?: string;
  logger: Logger;
}): Promise<void> {
  try {
    await prisma.gameSession.update({
      where: { token },
      data: {
        timeline: timeline as object,
        ...(status ? { status } : {}),
      },
    });
  } catch (error) {
    logger.error({ msg: "Error saving game timeline", error: (error as Error).message });
    throw error;
  }
}
