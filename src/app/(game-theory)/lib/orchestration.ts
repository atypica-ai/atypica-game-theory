import "server-only";

import { StatReporter } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { getGameType } from "../gameTypes";
import { GameType } from "../gameTypes/types";
import { GamePersonaSession, GameSessionExtra, GameSessionParticipant, GameTimeline } from "../types";
import { buildGamePersonaSession } from "./generation";
import { shouldTerminate, shuffle } from "./helpers";
import { calculateRoundPayoffs } from "./payoff";
import { saveGameTimeline } from "./persistence";
import { generateAIDecision, generateAIDiscussionTurn, PhaseContext } from "./phases";
import { failGameSessionRun } from "./runtime";

// ── Discussion phase (AI-only) ───────────────────────────────────────────────

async function runDiscussionPhase(
  timeline: GameTimeline,
  personaSessions: GamePersonaSession[],
  participants: GameSessionParticipant[],
  roundId: number,
  ctx: PhaseContext,
) {
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
}

// ── Decision phase (AI-only) ─────────────────────────────────────────────────

async function runDecisionPhase(
  timeline: GameTimeline,
  gameType: GameType,
  personaSessions: GamePersonaSession[],
  participants: GameSessionParticipant[],
  roundId: number,
  ctx: PhaseContext,
) {
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
}

// ── Main game loop (AI-only) ─────────────────────────────────────────────────

/**
 * Main game loop for AI-only sessions. No human players, no concurrent DB writers,
 * no polling. Clean and deterministic.
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
  try {
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
    const ctx: PhaseContext = { gameSessionToken, locale, abortSignal, statReport, logger, discussionRounds };

    const timeline: GameTimeline = [];
    timeline.push({ type: "system", content: gameType.rulesPrompt });
    await saveGameTimeline({ token: gameSessionToken, timeline, status: "running", extra, logger });

    let roundId = 1;

    while (true) {
      if (abortSignal.aborted) throw new Error("Game session aborted");

      logger.info({ msg: "Starting game round", roundId, gameType: session.gameType });

      const roundAnnouncement =
        locale === "zh-CN"
          ? `第 ${roundId} 轮开始。${discussionRounds > 0 ? "讨论阶段开始，每位玩家可以自由发言。" : "每位玩家请做出本轮决策。"}`
          : `Round ${roundId} begins. ${discussionRounds > 0 ? "Discussion phase: each player may speak freely before deciding." : "Each player must now make their decision."}`;

      timeline.push({ type: "system", content: roundAnnouncement, round: roundId });
      await saveGameTimeline({ token: gameSessionToken, timeline, logger });

      if (discussionRounds > 0) {
        await runDiscussionPhase(timeline, personaSessions, participants, roundId, ctx);
      }

      await runDecisionPhase(timeline, gameType, personaSessions, participants, roundId, ctx);

      const payoffs = calculateRoundPayoffs(gameType, timeline, roundId);
      timeline.push({ type: "round-result", round: roundId, payoffs });

      const payoffSummary = Object.entries(payoffs)
        .map(([id, v]) => {
          const name = participants.find((p) => p.personaId === Number(id))?.name ?? `Player ${id}`;
          return `${name}: ${v}`;
        })
        .join(", ");
      timeline.push({
        type: "system",
        content: locale === "zh-CN" ? `第 ${roundId} 轮结果 — ${payoffSummary}` : `Round ${roundId} results — ${payoffSummary}`,
        round: roundId,
      });

      logger.info({ msg: "Round completed", roundId, payoffs });
      await saveGameTimeline({ token: gameSessionToken, timeline, logger });

      if (shouldTerminate(gameType.horizon, roundId, timeline)) break;
      roundId++;
    }

    timeline.push({ type: "system", content: locale === "zh-CN" ? "游戏结束。" : "Game complete." });
    await saveGameTimeline({ token: gameSessionToken, timeline, status: "completed", logger });

    logger.info({ msg: "Game session completed", totalRounds: roundId });
    return timeline;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Game session failed", error: error.message });
    await failGameSessionRun(gameSessionToken, error).catch((dbErr) =>
      logger.error({ msg: "Failed to record game session failure", error: (dbErr as Error).message }),
    );
    throw error;
  }
}
