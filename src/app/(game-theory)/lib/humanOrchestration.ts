import "server-only";

import { prisma } from "@/prisma/prisma";
import { StatReporter } from "@/ai/tools/types";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { getGameType } from "../gameTypes";
import { GameType } from "../gameTypes/types";
import {
  GamePersonaSession,
  GameSessionExtra,
  GameSessionParticipant,
  GameTimeline,
  HUMAN_PLAYER_ID,
} from "../types";
import { buildGamePersonaSession } from "./generation";
import { PlayerHandler, runGameLoop } from "./gameLoop";
import { getDefaultAction, shuffle } from "./helpers";
import { waitForHumanSignal } from "./humanSignal";
import { appendTimelineEvents, refreshTimeline, saveGameTimeline } from "./persistence";
import { generateAIDecision, generateAIDiscussionTurn, PhaseContext } from "./phases";

// ── Human-aware player handler ──────────────────────────────────────────────

const humanAwareHandler: PlayerHandler = {
  async runDiscussionPhase(
    timeline: GameTimeline,
    _gameType: GameType,
    personaSessions: GamePersonaSession[],
    participants: GameSessionParticipant[],
    roundId: number,
    ctx: PhaseContext,
  ): Promise<GameTimeline> {
    ctx.logger.info({ msg: "Starting discussion phase (human)", roundId, discussionRounds: ctx.discussionRounds });

    let current = timeline;

    for (let turn = 0; turn < ctx.discussionRounds; turn++) {
      if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

      const speakerOrder = shuffle(personaSessions);

      for (const personaSession of speakerOrder) {
        if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

        if (personaSession.isHuman) {
          const requestId = crypto.randomUUID();
          const expiresAt = Date.now() + (ctx.humanTimeoutMs ?? 30_000);
          current.push({ type: "human-discussion-pending", round: roundId, requestId, expiresAt });
          await saveGameTimeline({ token: ctx.gameSessionToken, timeline: current, logger: ctx.logger });

          const result = await waitForHumanSignal(requestId, ctx.humanTimeoutMs ?? 30_000);
          const content = typeof result === "string" && result.trim() ? result.trim() : "(said nothing)";

          // Re-sync from DB to preserve server action writes
          const fresh = await refreshTimeline(ctx.gameSessionToken);
          fresh.push({
            type: "persona-discussion",
            personaId: HUMAN_PLAYER_ID,
            personaName: personaSession.personaName,
            reasoning: null,
            content,
            round: roundId,
          });
          await saveGameTimeline({ token: ctx.gameSessionToken, timeline: fresh, logger: ctx.logger });
          current = fresh;
        } else {
          await generateAIDiscussionTurn(current, personaSession, participants, roundId, ctx);
          await saveGameTimeline({ token: ctx.gameSessionToken, timeline: current, logger: ctx.logger });
        }
      }
    }

    ctx.logger.info({ msg: "Discussion phase complete (human)", roundId });
    return current;
  },

  async runDecisionPhase(
    timeline: GameTimeline,
    gameType: GameType,
    personaSessions: GamePersonaSession[],
    participants: GameSessionParticipant[],
    roundId: number,
    ctx: PhaseContext,
  ): Promise<GameTimeline> {
    ctx.logger.info({ msg: "Starting decision phase (human)", roundId, sequential: gameType.sequential });

    let current = timeline;

    if (gameType.sequential) {
      const shuffled = shuffle(personaSessions);

      for (const personaSession of shuffled) {
        if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

        if (personaSession.isHuman) {
          const requestId = crypto.randomUUID();
          const expiresAt = Date.now() + (ctx.humanTimeoutMs ?? 30_000);
          current.push({ type: "human-decision-pending", round: roundId, requestId, expiresAt });
          await saveGameTimeline({ token: ctx.gameSessionToken, timeline: current, logger: ctx.logger });

          const result = await waitForHumanSignal(requestId, ctx.humanTimeoutMs ?? 30_000);
          const content = (typeof result === "object" && result !== null) ? result : getDefaultAction(gameType);

          const fresh = await refreshTimeline(ctx.gameSessionToken);
          fresh.push({
            type: "persona-decision",
            personaId: HUMAN_PLAYER_ID,
            personaName: personaSession.personaName,
            reasoning: null,
            content,
            round: roundId,
          });
          await saveGameTimeline({ token: ctx.gameSessionToken, timeline: fresh, logger: ctx.logger });
          current = fresh;
        } else {
          const { reasoning, content } = await generateAIDecision(
            current, personaSession, gameType, participants, roundId, ctx,
          );
          current.push({
            type: "persona-decision",
            personaId: personaSession.personaId,
            personaName: personaSession.personaName,
            reasoning,
            content,
            round: roundId,
          });
          await saveGameTimeline({ token: ctx.gameSessionToken, timeline: current, logger: ctx.logger });
        }
      }
    } else {
      // ── Parallel mode: each decision saved individually for progressive reveal ──
      const snapshot = [...current];
      const aiSessions = personaSessions.filter((p) => !p.isHuman);
      const humanSession = personaSessions.find((p) => p.isHuman);

      // Each AI decision saves to DB individually as it completes
      const aiDecisionPromises = aiSessions.map(async (s) => {
        const result = await generateAIDecision(snapshot, s, gameType, participants, roundId, ctx);
        await appendTimelineEvents(ctx.gameSessionToken, [{
          type: "persona-decision" as const,
          personaId: result.personaSession.personaId,
          personaName: result.personaSession.personaName,
          reasoning: result.reasoning,
          content: result.content,
          round: roundId,
        }]);
        return result;
      });

      // Human signal resolves → save canonical decision immediately
      let humanCanonicalPromise: Promise<void> | undefined;
      if (humanSession) {
        const requestId = crypto.randomUUID();
        const expiresAt = Date.now() + (ctx.humanTimeoutMs ?? 30_000);
        current.push({ type: "human-decision-pending", round: roundId, requestId, expiresAt });
        await saveGameTimeline({ token: ctx.gameSessionToken, timeline: current, logger: ctx.logger });

        humanCanonicalPromise = waitForHumanSignal(requestId, ctx.humanTimeoutMs ?? 30_000)
          .then(async (result) => {
            const content = (typeof result === "object" && result !== null) ? result : getDefaultAction(gameType);
            await appendTimelineEvents(ctx.gameSessionToken, [{
              type: "persona-decision" as const,
              personaId: HUMAN_PLAYER_ID,
              personaName: humanSession.personaName,
              reasoning: null,
              content,
              round: roundId,
            }]);
          });
      }

      // Wait for all decisions to be individually saved
      await Promise.all([
        ...aiDecisionPromises,
        humanCanonicalPromise ?? Promise.resolve(),
      ]);

      // Refresh timeline — now contains all individually-saved decisions
      current = await refreshTimeline(ctx.gameSessionToken);
    }

    ctx.logger.info({ msg: "Decision phase complete (human)", roundId });
    return current;
  },
};

// ── Entry point ─────────────────────────────────────────────────────────────

/**
 * Main game loop for human-involved sessions.
 * Setup loads human + AI personas, then delegates to the shared game loop.
 */
export async function runHumanGameSession({
  gameSessionToken,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  gameSessionToken: string;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}): Promise<GameTimeline> {
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { token: gameSessionToken },
  });

  const gameType = getGameType(session.gameType);
  const sessionExtra = session.extra as GameSessionExtra;

  // Participants is the source of truth (includes human slot at position 0)
  const participants: GameSessionParticipant[] = sessionExtra.participants ?? [];

  // Load AI personas only (human has no DB persona record)
  const aiPersonaIds = participants.filter((p) => p.personaId > 0).map((p) => p.personaId);
  const personasUnordered = await prisma.persona.findMany({ where: { id: { in: aiPersonaIds } } });

  if (personasUnordered.length !== aiPersonaIds.length) {
    throw new Error(`Some personas not found. Expected ${aiPersonaIds.length}, got ${personasUnordered.length}`);
  }

  const personaMap = new Map(personasUnordered.map((p) => [p.id, p]));
  const personaModels = sessionExtra.personaModels ?? {};

  // Build personaSessions in participant order (human first, then AI)
  const personaSessions: GamePersonaSession[] = participants.map((p) => {
    if (p.personaId === HUMAN_PLAYER_ID) {
      return {
        personaId: HUMAN_PLAYER_ID,
        personaName: p.name,
        systemPrompt: "",
        modelName: "gemini-3-flash" as const,
        isHuman: true as const,
        userId: p.userId,
      };
    }
    const persona = personaMap.get(p.personaId)!;
    return buildGamePersonaSession({
      persona,
      locale,
      modelName: personaModels[persona.id] ?? "gemini-3-flash",
    });
  });

  const extra: GameSessionExtra = {
    gameType: session.gameType,
    participants,
    personaModels: sessionExtra.personaModels,
    ...(sessionExtra.discussionRounds !== undefined ? { discussionRounds: sessionExtra.discussionRounds } : {}),
  };
  const discussionRounds = sessionExtra.discussionRounds ?? gameType.discussionRounds;
  const humanTimeoutMs = 30_000;
  const ctx: PhaseContext = { gameSessionToken, locale, abortSignal, statReport, logger, discussionRounds, humanTimeoutMs };

  const timeline: GameTimeline = [{ type: "system", content: gameType.rulesPrompt }];
  await saveGameTimeline({ token: gameSessionToken, timeline, status: "running", extra, logger });

  return runGameLoop({
    handler: humanAwareHandler,
    gameSessionToken,
    gameType,
    personaSessions,
    participants,
    initialTimeline: timeline,
    ctx,
  });
}
