"use server";

import { prisma } from "@/prisma/prisma";
import { GameSessionTimeline } from "./types";

export interface GameSessionDetail {
  token: string;
  gameType: string;
  status: string;
  timeline: GameSessionTimeline;
  personas: { id: number; name: string }[];
}

/**
 * Fetch a game session by token.
 * No auth check since GameSession has no user/team ownership yet.
 */
export async function fetchGameSession(token: string): Promise<
  | { success: true; data: GameSessionDetail }
  | { success: false; message: string }
> {
  try {
    const session = await prisma.gameSession.findUnique({
      where: { token },
      select: {
        token: true,
        gameType: true,
        status: true,
        timeline: true,
        personaIds: true,
      },
    });

    if (!session) {
      return { success: false, message: "Game session not found" };
    }

    const personaIds = Array.isArray(session.personaIds)
      ? session.personaIds.filter((id): id is number => typeof id === "number")
      : [];

    const personas = await prisma.persona.findMany({
      where: { id: { in: personaIds } },
      select: { id: true, name: true },
    });

    return {
      success: true,
      data: {
        token: session.token,
        gameType: session.gameType,
        status: session.status,
        timeline: (session.timeline ?? {}) as GameSessionTimeline,
        personas,
      },
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
