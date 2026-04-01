"use server";

import { prisma } from "@/prisma/prisma";
import { TournamentExtra, TournamentState } from "./types";
import { launchTournament } from "./lib/launch";

export interface TournamentDetail {
  token: string;
  status: string;
  state: TournamentState;
  extra: TournamentExtra;
}

/**
 * Fetch a tournament by token.
 */
export async function fetchTournament(token: string): Promise<
  { success: true; data: TournamentDetail } | { success: false; message: string }
> {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { token },
      select: { token: true, status: true, state: true, extra: true },
    });

    if (!tournament) {
      return { success: false, message: "Tournament not found" };
    }

    return {
      success: true,
      data: {
        token: tournament.token,
        status: tournament.status,
        state: (tournament.state ?? { stages: [] }) as TournamentState,
        extra: (tournament.extra ?? {}) as TournamentExtra,
      },
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Create a new tournament and kick off the game loop in the background.
 */
export async function createTournament(
  personaIds: number[],
): Promise<{ success: true; token: string } | { success: false; message: string }> {
  try {
    const { token } = await launchTournament(personaIds); // useAfter: true (default)
    return { success: true, token };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
