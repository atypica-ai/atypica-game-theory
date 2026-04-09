"use server";

import authOptions from "@/app/(auth)/authOptions";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth/next";
import { getGameType } from "./gameTypes";
import { buildGamePersonaSession } from "./lib/generation";
import { shouldTerminate } from "./lib/helpers";
import { calculateRoundPayoffs } from "./lib/payoff";
import { appendTimelineEvents, refreshTimeline, saveGameTimeline } from "./lib/persistence";
import { generateAIDiscussionTurn } from "./lib/phases";
import {
  GameSessionExtra,
  GameTimeline,
  HUMAN_PLAYER_ID,
  PersonaDecisionEvent,
  PersonaDiscussionEvent,
} from "./types";

// ===========================================================================
// Frontend-driven human game actions
// ===========================================================================
// These server actions are called by HumanGameView to drive the game step by
// step. No background orchestration — the frontend IS the game loop.
// ===========================================================================

/** Validate auth + participant in one shot */
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

/** Build an AI persona session from DB for a given personaId */
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
