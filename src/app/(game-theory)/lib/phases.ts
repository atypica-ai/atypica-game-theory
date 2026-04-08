import "server-only";

import { StatReporter } from "@/ai/tools/types";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { GameType } from "../gameTypes/types";
import { GamePersonaSession, GameSessionParticipant, GameTimeline } from "../types";
import { formatTimelineForDecision, formatTimelineForDiscussion } from "./formatting";
import { generatePlayerDecision, generatePlayerDiscussion } from "./generation";

// ── Shared context type ──────────────────────────────────────────────────────

export interface PhaseContext {
  gameSessionToken: string;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
  discussionRounds: number;
  /** Timeout for human input in milliseconds. Defaults to 30_000. */
  humanTimeoutMs: number;
}

// ── AI discussion turn ───────────────────────────────────────────────────────

/**
 * Generate a single AI player's discussion message and append it to the timeline.
 * Does NOT save — caller is responsible for persisting.
 */
export async function generateAIDiscussionTurn(
  timeline: GameTimeline,
  personaSession: GamePersonaSession,
  participants: GameSessionParticipant[],
  roundId: number,
  ctx: PhaseContext,
): Promise<void> {
  const context = formatTimelineForDiscussion(timeline, personaSession.personaId, participants, roundId);

  const { reasoning, content } = await generatePlayerDiscussion({
    personaSession,
    formattedContext: context,
    round: roundId,
    locale: ctx.locale,
    abortSignal: ctx.abortSignal,
    statReport: ctx.statReport,
    logger: ctx.logger.child({ personaId: personaSession.personaId }),
  });

  timeline.push({
    type: "persona-discussion",
    personaId: personaSession.personaId,
    personaName: personaSession.personaName,
    reasoning,
    content,
    round: roundId,
  });
}

// ── AI decision ──────────────────────────────────────────────────────────────

export interface AIDecisionResult {
  personaSession: GamePersonaSession;
  reasoning: string | null;
  content: Record<string, unknown>;
}

/**
 * Generate a single AI player's decision. Returns the result without modifying timeline.
 * Caller appends to timeline in the desired order.
 */
export async function generateAIDecision(
  snapshot: GameTimeline,
  personaSession: GamePersonaSession,
  gameType: GameType,
  participants: GameSessionParticipant[],
  roundId: number,
  ctx: PhaseContext,
): Promise<AIDecisionResult> {
  const context = formatTimelineForDecision(snapshot, personaSession.personaId, participants, roundId, gameType.simultaneousReveal);

  const { reasoning, content } = await generatePlayerDecision({
    personaSession,
    gameType,
    formattedContext: context,
    round: roundId,
    locale: ctx.locale,
    abortSignal: ctx.abortSignal,
    statReport: ctx.statReport,
    logger: ctx.logger.child({ personaId: personaSession.personaId }),
  });

  return { personaSession, reasoning, content };
}
