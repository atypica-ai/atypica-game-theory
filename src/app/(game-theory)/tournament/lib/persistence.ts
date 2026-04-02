import "server-only";

import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";
import { TournamentExtra, TournamentState } from "../types";

export async function saveTournamentState({
  token,
  state,
  status,
  extra,
  logger,
}: {
  token: string;
  state: TournamentState;
  status?: string;
  extra?: TournamentExtra;
  logger: Logger;
}): Promise<void> {
  try {
    await prisma.tournament.update({
      where: { token },
      data: {
        state: state,
        ...(status ? { status } : {}),
        ...(extra ? { extra: extra as object } : {}),
      },
    });
  } catch (error) {
    logger.error({ msg: "Error saving tournament state", error: (error as Error).message });
    throw error;
  }
}
