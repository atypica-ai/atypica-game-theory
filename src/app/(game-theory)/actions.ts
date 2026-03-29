"use server";

import type { StatReporter } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import type { Persona } from "@/prisma/client";
import { searchPersonas as searchPersonasFromMeili } from "@/search/lib/queries";
import { gameTypeRegistry } from "./gameTypes";
import { runGameSession } from "./lib";
import { GameSessionExtra, GameTimeline } from "./types";

export interface GameSessionDetail {
  token: string;
  gameType: string;
  status: string;
  events: GameTimeline;
  extra: GameSessionExtra;
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
        extra: true,
      },
    });

    if (!session) {
      return { success: false, message: "Game session not found" };
    }

    const events = Array.isArray(session.timeline) ? (session.timeline as GameTimeline) : [];
    const extra = (session.extra ?? {}) as GameSessionExtra;

    return {
      success: true,
      data: {
        token: session.token,
        gameType: session.gameType,
        status: session.status,
        events,
        extra,
      },
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Create a new game session and kick off the game loop in the background.
// ---------------------------------------------------------------------------

export async function createGameSession(
  gameTypeName: string,
  personaIds: number[],
): Promise<{ success: true; token: string } | { success: false; message: string }> {
  try {
    const gameType = gameTypeRegistry[gameTypeName];
    if (!gameType) {
      return { success: false, message: `Unknown game type: "${gameTypeName}"` };
    }
    if (personaIds.length < gameType.minPlayers || personaIds.length > gameType.maxPlayers) {
      return {
        success: false,
        message: `${gameType.displayName} requires ${gameType.minPlayers}–${gameType.maxPlayers} players, got ${personaIds.length}`,
      };
    }

    // Load persona names for the extra field
    const personas = await prisma.persona.findMany({
      where: { id: { in: personaIds } },
      select: { id: true, name: true },
    });

    const personaMap = new Map(personas.map((p) => [p.id, p]));
    const participants = personaIds.map((id) => ({
      personaId: id,
      name: personaMap.get(id)?.name ?? `Persona ${id}`,
    }));

    const initialExtra: GameSessionExtra = { gameType: gameTypeName, participants };

    const token = generateToken(16);

    await prisma.gameSession.create({
      data: {
        token,
        gameType: gameTypeName,
        personaIds,
        timeline: [],
        extra: initialExtra as object,
        status: "pending",
      },
    });

    const noopStatReport: StatReporter = async () => {};
    const logger = rootLogger.child({ gameSessionToken: token, gameType: gameTypeName });

    // Fire and forget — the session page polls for updates
    runGameSession({
      gameSessionToken: token,
      locale: "en-US",
      abortSignal: new AbortController().signal,
      statReport: noopStatReport,
      logger,
    }).catch((err: Error) => {
      logger.error({ msg: "Game session failed", error: err.message });
    });

    return { success: true, token };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Fetch all available personas for the game session init picker.
// ---------------------------------------------------------------------------

export type PersonaForPicker = Pick<Persona, "id" | "name" | "source"> & {
  tags: string[];
};

export async function fetchPersonasForGame(): Promise<
  { success: true; data: PersonaForPicker[] } | { success: false; message: string }
> {
  try {
    const personas = await prisma.persona.findMany({
      select: { id: true, name: true, source: true, tags: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return {
      success: true,
      data: personas.map((p) => ({
        id: p.id,
        name: p.name,
        source: p.source,
        tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
      })),
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Search personas by text query using Meilisearch, falling back to recents.
// ---------------------------------------------------------------------------

export async function searchPersonasForGame(searchQuery: string): Promise<
  { success: true; data: PersonaForPicker[] } | { success: false; message: string }
> {
  const query = searchQuery.trim();
  if (!query) return fetchPersonasForGame();

  try {
    const results = await searchPersonasFromMeili({ query, page: 1, pageSize: 20 });

    const personaIds = results.hits
      .map((hit) => {
        const match = hit.slug.match(/^persona-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((id) => id > 0);

    if (personaIds.length === 0) return { success: true, data: [] };

    const personas = await prisma.persona.findMany({
      where: { id: { in: personaIds } },
      select: { id: true, name: true, source: true, tags: true },
    });

    const map = new Map(personas.map((p) => [p.id, p]));
    const ordered = personaIds.map((id) => map.get(id)).filter(Boolean) as typeof personas;

    return {
      success: true,
      data: ordered.map((p) => ({
        id: p.id,
        name: p.name,
        source: p.source,
        tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
      })),
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}
