import "server-only";

import { StatReporter } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { getGameType } from "../gameTypes";
import { GameType } from "../gameTypes/types";
import { GamePersonaSession, GameSessionExtra, GameSessionParticipant, GameTimeline } from "../types";
import { buildGamePersonaSession } from "./generation";
import { PlayerHandler, runGameLoop } from "./gameLoop";
import { shuffle } from "./helpers";
import { saveGameTimeline } from "./persistence";
import { generateAIDecision, generateAIDiscussionTurn, PhaseContext } from "./phases";

// ── AI-only player handler ──────────────────────────────────────────────────

const aiPlayerHandler: PlayerHandler = {
  async runDiscussionPhase(
    timeline: GameTimeline,
    _gameType: GameType,
    personaSessions: GamePersonaSession[],
    participants: GameSessionParticipant[],
    roundId: number,
    ctx: PhaseContext,
  ): Promise<GameTimeline> {
    ctx.logger.info({ msg: "Starting discussion phase", roundId, discussionRounds: ctx.discussionRounds });

    for (let turn = 0; turn < ctx.discussionRounds; turn++) {
      if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

      const speakerOrder = shuffle(personaSessions);

      for (const personaSession of speakerOrder) {
        if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

        await generateAIDiscussionTurn(timeline, personaSession, participants, roundId, ctx);
        await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });
      }
    }

    ctx.logger.info({ msg: "Discussion phase complete", roundId });
    return timeline;
  },

  async runDecisionPhase(
    timeline: GameTimeline,
    gameType: GameType,
    personaSessions: GamePersonaSession[],
    participants: GameSessionParticipant[],
    roundId: number,
    ctx: PhaseContext,
  ): Promise<GameTimeline> {
    ctx.logger.info({ msg: "Starting decision phase", roundId, sequential: gameType.sequential });

    if (gameType.sequential) {
      const shuffled = shuffle(personaSessions);

      for (const personaSession of shuffled) {
        if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

        const { reasoning, content } = await generateAIDecision(
          timeline, personaSession, gameType, participants, roundId, ctx,
        );

        timeline.push({
          type: "persona-decision",
          personaId: personaSession.personaId,
          personaName: personaSession.personaName,
          reasoning,
          content,
          round: roundId,
        });
        await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });
      }
    } else {
      // Parallel: all players decide simultaneously from shared snapshot
      const snapshot = [...timeline];

      const results = await Promise.all(
        personaSessions.map((s) => generateAIDecision(snapshot, s, gameType, participants, roundId, ctx)),
      );

      for (const { personaSession, reasoning, content } of results) {
        timeline.push({
          type: "persona-decision",
          personaId: personaSession.personaId,
          personaName: personaSession.personaName,
          reasoning,
          content,
          round: roundId,
        });
      }

      await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });
    }

    ctx.logger.info({ msg: "Decision phase complete", roundId });
    return timeline;
  },
};

// ── Entry point ─────────────────────────────────────────────────────────────

/**
 * Main game loop for AI-only sessions. No human players, no concurrent DB writers.
 * Setup loads personas, then delegates to the shared game loop with AI-only handler.
 */
export async function runGameSession({
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
  const personaIds = session.personaIds as number[];

  const personasUnordered = await prisma.persona.findMany({ where: { id: { in: personaIds } } });
  if (personasUnordered.length !== personaIds.length) {
    throw new Error(`Some personas not found. Expected ${personaIds.length}, got ${personasUnordered.length}`);
  }

  const personaMap = new Map(personasUnordered.map((p) => [p.id, p]));
  const sessionExtra = session.extra as GameSessionExtra;
  const personaModels = sessionExtra.personaModels ?? {};

  const personaSessions = personaIds.map((id) => {
    const persona = personaMap.get(id)!;
    return buildGamePersonaSession({
      persona,
      locale,
      modelName: personaModels[persona.id] ?? "gemini-3-flash",
    });
  });

  const participants: GameSessionParticipant[] = personaIds.map((id) => ({
    personaId: id,
    name: personaMap.get(id)!.name,
  }));

  const extra: GameSessionExtra = {
    gameType: session.gameType,
    participants,
    personaModels: sessionExtra.personaModels,
    ...(sessionExtra.discussionRounds !== undefined ? { discussionRounds: sessionExtra.discussionRounds } : {}),
  };
  const discussionRounds = sessionExtra.discussionRounds ?? gameType.discussionRounds;
  const ctx: PhaseContext = { gameSessionToken, locale, abortSignal, statReport, logger, discussionRounds, humanTimeoutMs: 30_000 };

  const timeline: GameTimeline = [{ type: "system", content: gameType.rulesPrompt }];
  await saveGameTimeline({ token: gameSessionToken, timeline, status: "running", extra, logger });

  return runGameLoop({
    handler: aiPlayerHandler,
    gameSessionToken,
    gameType,
    personaSessions,
    participants,
    initialTimeline: timeline,
    ctx,
  });
}
