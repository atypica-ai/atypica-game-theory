"use server";

import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import type { Persona } from "@/prisma/client";
import { searchPersonas as searchPersonasFromMeili } from "@/search/lib/queries";
import { getServerSession } from "next-auth/next";
import { launchGameSession, launchHumanGameSession } from "./lib";
import { getGameType } from "./gameTypes";
import { buildGamePersonaSession } from "./lib/generation";
import { shouldTerminate } from "./lib/helpers";
import { calculateRoundPayoffs } from "./lib/payoff";
import { appendTimelineEvents, refreshTimeline, saveGameTimeline } from "./lib/persistence";
import { generateAIDecision, generateAIDiscussionTurn } from "./lib/phases";
import {
  GameSessionExtra,
  GameTimeline,
  HUMAN_PLAYER_ID,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
} from "./types";

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
  discussionRounds?: number,
): Promise<{ success: true; token: string } | { success: false; message: string }> {
  try {
    const { token } = await launchGameSession(gameTypeName, personaIds, { discussionRounds });
    return { success: true, token };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Create a game session where the authenticated user is a participant.
// ---------------------------------------------------------------------------

export async function createHumanGameSession(
  gameTypeName: string,
  discussionRounds?: number,
): Promise<{ success: true; token: string } | { success: false; message: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, message: "Authentication required" };
    }
    // No background loop — frontend drives the game via server actions
    const { token } = await launchHumanGameSession(
      gameTypeName, session.user.id, session.user.name ?? "You", { discussionRounds },
    );
    return { success: true, token };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ===========================================================================
// Frontend-driven human game actions
// ===========================================================================
// These server actions are called by HumanGameView to drive the game step by
// step. No background orchestration — the frontend IS the game loop.
// ===========================================================================

/** Helper: validate auth + participant in one shot */
async function validateHumanParticipant(token: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Authentication required");

  const row = await prisma.gameSession.findUnique({
    where: { token },
    select: { gameType: true, extra: true, timeline: true },
  });
  if (!row) throw new Error("Game session not found");

  const extra = (row.extra ?? {}) as GameSessionExtra;
  const human = extra.participants?.find((p) => p.personaId === HUMAN_PLAYER_ID);
  if (!human || human.userId !== session.user.id) throw new Error("Not a participant");

  const timeline = (Array.isArray(row.timeline) ? row.timeline : []) as GameTimeline;
  return { extra, timeline, gameTypeName: row.gameType, userId: session.user.id, humanName: human.name };
}

/** Helper: build an AI persona session from DB for a given personaId */
async function buildPersonaSessionForAction(personaId: number, extra: GameSessionExtra) {
  const persona = await prisma.persona.findUniqueOrThrow({ where: { id: personaId } });
  const modelName = extra.personaModels?.[personaId] ?? "gemini-3-flash";
  return buildGamePersonaSession({ persona, locale: "en-US", modelName });
}

// ---------------------------------------------------------------------------
// Start a new round — append round announcement
// ---------------------------------------------------------------------------

export async function startHumanRound(
  token: string,
  roundId: number,
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    await validateHumanParticipant(token);
    const extra = (await prisma.gameSession.findUnique({ where: { token }, select: { extra: true } }))?.extra as GameSessionExtra;
    const discussionRounds = extra?.discussionRounds ?? getGameType(extra.gameType).discussionRounds;

    const announcement = `Round ${roundId} begins. ${
      discussionRounds > 0
        ? "Discussion phase: each player may speak freely before deciding."
        : "Each player must now make their decision."
    }`;

    await appendTimelineEvents(token, [{ type: "system", content: announcement, round: roundId }]);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Run one AI discussion turn — find next AI who hasn't spoken this round
// ---------------------------------------------------------------------------

export async function runNextAIDiscussion(
  token: string,
  roundId: number,
): Promise<
  | { success: true; done: false; event: PersonaDiscussionEvent }
  | { success: true; done: true }
  | { success: false; message: string }
> {
  try {
    const { extra, timeline } = await validateHumanParticipant(token);
    const participants = extra.participants ?? [];

    // Find AI personas who haven't spoken in this round
    const spokenIds = new Set(
      timeline
        .filter((e): e is PersonaDiscussionEvent => e.type === "persona-discussion" && e.round === roundId)
        .map((e) => e.personaId),
    );
    const nextAI = participants.find((p) => p.personaId !== HUMAN_PLAYER_ID && !spokenIds.has(p.personaId));
    if (!nextAI) return { success: true, done: true };

    const personaSession = await buildPersonaSessionForAction(nextAI.personaId, extra);

    // Read fresh timeline for LLM context
    const freshTimeline = await refreshTimeline(token);
    const logger = rootLogger.child({ gameSessionToken: token, personaId: nextAI.personaId });
    const noopStatReport = async () => {};
    const ctx = {
      gameSessionToken: token,
      locale: "en-US" as const,
      abortSignal: new AbortController().signal,
      statReport: noopStatReport,
      logger,
      discussionRounds: extra.discussionRounds ?? getGameType(extra.gameType).discussionRounds,
    };

    // generateAIDiscussionTurn appends to the array in-memory
    await generateAIDiscussionTurn(freshTimeline, personaSession, participants, roundId, ctx);

    // The event is the last item generateAIDiscussionTurn pushed
    const event = freshTimeline[freshTimeline.length - 1] as PersonaDiscussionEvent;

    // Persist atomically
    await appendTimelineEvents(token, [event]);

    return { success: true, done: false, event };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Submit human discussion — append canonical persona-discussion directly
// ---------------------------------------------------------------------------

export async function submitHumanDiscussion(
  token: string,
  content: string,
  roundId: number,
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    const { humanName } = await validateHumanParticipant(token);
    const trimmed = content.trim() || "(said nothing)";

    const event: PersonaDiscussionEvent = {
      type: "persona-discussion",
      personaId: HUMAN_PLAYER_ID,
      personaName: humanName,
      reasoning: null,
      content: trimmed,
      round: roundId,
    };

    await appendTimelineEvents(token, [event]);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Run one AI decision — generate for a specific AI persona
// ---------------------------------------------------------------------------

export async function runAIDecision(
  token: string,
  personaId: number,
  roundId: number,
): Promise<
  | { success: true; event: PersonaDecisionEvent }
  | { success: false; message: string }
> {
  try {
    const { extra } = await validateHumanParticipant(token);
    const participants = extra.participants ?? [];
    const gameType = getGameType(extra.gameType);
    const personaSession = await buildPersonaSessionForAction(personaId, extra);

    // Snapshot timeline for decision context (decisions are simultaneous — use pre-decision state)
    const snapshot = await refreshTimeline(token);
    const logger = rootLogger.child({ gameSessionToken: token, personaId });
    const noopStatReport = async () => {};
    const ctx = {
      gameSessionToken: token,
      locale: "en-US" as const,
      abortSignal: new AbortController().signal,
      statReport: noopStatReport,
      logger,
      discussionRounds: extra.discussionRounds ?? gameType.discussionRounds,
    };

    const result = await generateAIDecision(snapshot, personaSession, gameType, participants, roundId, ctx);

    const event: PersonaDecisionEvent = {
      type: "persona-decision",
      personaId: result.personaSession.personaId,
      personaName: result.personaSession.personaName,
      reasoning: result.reasoning,
      content: result.content,
      round: roundId,
    };

    await appendTimelineEvents(token, [event]);
    return { success: true, event };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Submit human decision — append canonical persona-decision directly
// ---------------------------------------------------------------------------

export async function submitHumanDecision(
  token: string,
  action: Record<string, unknown>,
  roundId: number,
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    const { extra, humanName } = await validateHumanParticipant(token);
    const gameType = getGameType(extra.gameType);

    const parsed = gameType.actionSchema.safeParse(action);
    if (!parsed.success) {
      return { success: false, message: `Invalid action: ${parsed.error.message}` };
    }

    const event: PersonaDecisionEvent = {
      type: "persona-decision",
      personaId: HUMAN_PLAYER_ID,
      personaName: humanName,
      reasoning: null,
      content: parsed.data as Record<string, unknown>,
      round: roundId,
    };

    await appendTimelineEvents(token, [event]);
    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Settle round — calculate payoffs, check termination
// ---------------------------------------------------------------------------

export async function settleHumanRound(
  token: string,
  roundId: number,
): Promise<
  | { success: true; payoffs: Record<number, number>; isTerminated: boolean }
  | { success: false; message: string }
> {
  try {
    const { extra } = await validateHumanParticipant(token);
    const participants = extra.participants ?? [];
    const gameType = getGameType(extra.gameType);

    const timeline = await refreshTimeline(token);
    const payoffs = calculateRoundPayoffs(gameType, timeline, roundId);

    const payoffSummary = Object.entries(payoffs)
      .map(([id, v]) => {
        const name = participants.find((p) => p.personaId === Number(id))?.name ?? `Player ${id}`;
        return `${name}: ${v}`;
      })
      .join(", ");

    await appendTimelineEvents(token, [
      { type: "round-result", round: roundId, payoffs },
      { type: "system", content: `Round ${roundId} results — ${payoffSummary}`, round: roundId },
    ]);

    // Check if the game should end after this round
    const updatedTimeline = await refreshTimeline(token);
    const isTerminated = shouldTerminate(gameType.horizon, roundId, updatedTimeline);

    return { success: true, payoffs, isTerminated };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Complete game — append final event, set status
// ---------------------------------------------------------------------------

export async function completeHumanGame(
  token: string,
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    await validateHumanParticipant(token);
    const timeline = await refreshTimeline(token);
    timeline.push({ type: "system", content: "Game complete." });
    const logger = rootLogger.child({ gameSessionToken: token });
    await saveGameTimeline({ token, timeline, status: "completed", logger });
    return { success: true };
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
