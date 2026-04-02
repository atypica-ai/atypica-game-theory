import "server-only";

import { StatReporter } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { getGameType } from "../gameTypes";
import { GameType, Horizon } from "../gameTypes/types";
import { GamePersonaSession, GameSessionExtra, GameSessionParticipant, GameTimeline } from "../types";
import { buildGamePersonaSession, generatePlayerDecision, generatePlayerDiscussion } from "./generation";
import { formatTimelineForDecision, formatTimelineForDiscussion } from "./formatting";
import { calculateRoundPayoffs } from "./payoff";
import { saveGameTimeline } from "./persistence";
import { failGameSessionRun } from "./runtime";

// ── Shared context type ───────────────────────────────────────────────────────

interface PhaseContext {
  gameSessionToken: string;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
  discussionRounds: number; // effective value for this session
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shouldTerminate(horizon: Horizon, roundId: number, timeline: GameTimeline): boolean {
  switch (horizon.type) {
    case "fixed":
      return roundId >= horizon.rounds;
    case "condition":
      return horizon.shouldTerminate(timeline);
    case "indefinite":
      return roundId >= horizon.maxRounds;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Discussion phase ──────────────────────────────────────────────────────────

/**
 * Discussion phase: all players speak in randomized order, sequentially, so each
 * speaker sees all prior messages. Saves after each message for live frontend polling.
 */
async function runDiscussionPhase(
  timeline: GameTimeline,
  gameType: GameType,
  personaSessions: GamePersonaSession[],
  participants: GameSessionParticipant[],
  roundId: number,
  ctx: PhaseContext,
) {
  ctx.logger.info({ msg: "Starting discussion phase", roundId, discussionRounds: ctx.discussionRounds });

  for (let turn = 0; turn < ctx.discussionRounds; turn++) {
    if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

    const speakerOrder = shuffle(personaSessions);
    ctx.logger.info({ msg: "Discussion turn begin", roundId, turn, speakerOrder: speakerOrder.map((p) => p.personaId) });

    for (const personaSession of speakerOrder) {
      if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

      ctx.logger.info({ msg: "Generating discussion message", roundId, turn, personaId: personaSession.personaId });

      const context = formatTimelineForDiscussion(timeline, personaSession.personaId, participants, roundId);

      let reasoning: string | null;
      let content: string;
      try {
        ({ reasoning, content } = await generatePlayerDiscussion({
          personaSession,
          formattedContext: context,
          round: roundId,
          locale: ctx.locale,
          abortSignal: ctx.abortSignal,
          statReport: ctx.statReport,
          logger: ctx.logger.child({ personaId: personaSession.personaId }),
        }));
      } catch (err) {
        ctx.logger.error({ msg: "Discussion generation failed", roundId, turn, personaId: personaSession.personaId, error: (err as Error).message });
        throw err;
      }

      timeline.push({ type: "persona-discussion", personaId: personaSession.personaId, personaName: personaSession.personaName, reasoning, content, round: roundId });
      await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });
    }
  }

  ctx.logger.info({ msg: "Discussion phase complete", roundId });
}

// ── Decision phase ────────────────────────────────────────────────────────────

/**
 * Decision phase: all players decide in parallel from a shared timeline snapshot.
 * Since decisions are simultaneous, no player needs to wait for another's choice.
 * Results are appended in original player order for a deterministic timeline.
 * Single DB save after all decisions (truly simultaneous — no incremental visibility).
 */
async function runDecisionPhase(
  timeline: GameTimeline,
  gameType: GameType,
  personaSessions: GamePersonaSession[],
  participants: GameSessionParticipant[],
  roundId: number,
  ctx: PhaseContext,
) {
  ctx.logger.info({ msg: "Starting decision phase", roundId, players: personaSessions.map((p) => p.personaId) });

  // Snapshot before any decisions — each player formats context from the same state
  const snapshot = [...timeline];

  const results = await Promise.all(
    personaSessions.map(async (personaSession) => {
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
    }),
  );

  // Append in original player order for a deterministic timeline
  for (const { personaSession, reasoning, content } of results) {
    timeline.push({ type: "persona-decision", personaId: personaSession.personaId, personaName: personaSession.personaName, reasoning, content, round: roundId });
  }

  await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });
  ctx.logger.info({ msg: "Decision phase complete", roundId });
}

// ── Main game loop ────────────────────────────────────────────────────────────

/**
 * Main game loop. Runs all rounds of a game session, persisting the timeline so
 * the frontend can poll for live progress.
 * Called from playGameTool after the GameSession record is created.
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

  // Load personas and preserve the personaIds order (findMany does not guarantee order)
  const personasUnordered = await prisma.persona.findMany({ where: { id: { in: personaIds } } });

  if (personasUnordered.length !== personaIds.length) {
    throw new Error(`Some personas not found. Expected ${personaIds.length}, got ${personasUnordered.length}`);
  }

  const personaMap = new Map(personasUnordered.map((p) => [p.id, p]));
  const personas = personaIds.map((id) => personaMap.get(id)!);

  const sessionExtra = session.extra as GameSessionExtra;
  const personaModels = sessionExtra.personaModels ?? {};

  const personaSessions = personas.map((persona) =>
    buildGamePersonaSession({
      persona,
      locale,
      modelName: personaModels[persona.id] ?? "gemini-3-flash",
    }),
  );

  const participants: GameSessionExtra["participants"] = personas.map((p) => ({ personaId: p.id, name: p.name }));
  const extra: GameSessionExtra = {
    gameType: session.gameType,
    participants,
    personaModels: sessionExtra.personaModels,
    ...(sessionExtra.discussionRounds !== undefined ? { discussionRounds: sessionExtra.discussionRounds } : {}),
  };
  const discussionRounds = sessionExtra.discussionRounds ?? gameType.discussionRounds;
  const ctx: PhaseContext = { gameSessionToken, locale, abortSignal, statReport, logger, discussionRounds };

  // Initialize timeline with rules announcement, mark as running
  const timeline: GameTimeline = [];
  timeline.push({ type: "system", content: gameType.rulesPrompt });
  await saveGameTimeline({ token: gameSessionToken, timeline, status: "running", extra, logger });

  let roundId = 1;

  while (true) {
    if (abortSignal.aborted) throw new Error("Game session aborted");

    logger.info({ msg: "Starting game round", roundId, gameType: session.gameType });

    const roundAnnouncement =
      locale === "zh-CN"
        ? `第 ${roundId} 轮开始。${ctx.discussionRounds > 0 ? "讨论阶段开始，每位玩家可以自由发言。" : "每位玩家请做出本轮决策。"}`
        : `Round ${roundId} begins. ${ctx.discussionRounds > 0 ? "Discussion phase: each player may speak freely before deciding." : "Each player must now make their decision."}`;

    timeline.push({ type: "system", content: roundAnnouncement, round: roundId });
    await saveGameTimeline({ token: gameSessionToken, timeline, logger });

    if (ctx.discussionRounds > 0) {
      await runDiscussionPhase(timeline, gameType, personaSessions, participants, roundId, ctx);
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
