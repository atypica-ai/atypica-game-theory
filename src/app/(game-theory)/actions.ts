"use server";

import { prisma } from "@/prisma/prisma";
import type { Persona } from "@/prisma/client";
import { searchPersonas as searchPersonasFromMeili } from "@/search/lib/queries";
import { launchGameSession } from "./lib";
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
    const { token } = await launchGameSession(gameTypeName, personaIds); // useAfter: true (default)
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

// ---------------------------------------------------------------------------
// Fetch all game sessions (for the past games browser).
// ---------------------------------------------------------------------------

export interface SessionListItem {
  token: string;
  gameType: string;
  status: string;
  events: GameTimeline;
  extra: GameSessionExtra;
  createdAt: string; // ISO 8601 — serializable as server→client prop
}

export async function fetchAllSessions(): Promise<
  { success: true; data: SessionListItem[] } | { success: false; message: string }
> {
  try {
    const sessions = await prisma.gameSession.findMany({
      select: {
        token: true,
        gameType: true,
        status: true,
        timeline: true,
        extra: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return {
      success: true,
      data: sessions.map((s) => ({
        token: s.token,
        gameType: s.gameType,
        status: s.status,
        events: Array.isArray(s.timeline) ? (s.timeline as GameTimeline) : [],
        extra: (s.extra ?? {}) as GameSessionExtra,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Count sessions per game type (for home page game cards).
// ---------------------------------------------------------------------------

export async function fetchSessionCountsByGameType(): Promise<
  { success: true; data: Record<string, number> } | { success: false; message: string }
> {
  try {
    const counts = await prisma.gameSession.groupBy({
      by: ["gameType"],
      _count: { id: true },
    });
    const result: Record<string, number> = {};
    for (const row of counts) {
      result[row.gameType] = row._count.id;
    }
    return { success: true, data: result };
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
