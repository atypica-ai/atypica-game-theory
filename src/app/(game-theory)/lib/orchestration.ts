import "server-only";

import { StatReporter } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { getGameType } from "../gameTypes";
import { GameType, Horizon } from "../gameTypes/types";
import { GamePersonaSession, GameSessionExtra, GameSessionParticipant, GameTimeline, HUMAN_PLAYER_ID } from "../types";
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll the timeline every 1s until a human-*-submitted event with the given requestId appears.
 * Returns the submitted content, or null if the timeout elapses.
 */
async function waitForHumanInput(
  token: string,
  requestId: string,
  timeoutMs: number,
): Promise<string | Record<string, unknown> | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(1_000);
    const row = await prisma.gameSession.findUnique({ where: { token }, select: { timeline: true } });
    if (!row) return null;
    const timeline = Array.isArray(row.timeline) ? (row.timeline as GameTimeline) : [];
    for (const e of timeline) {
      if (e.type === "human-discussion-submitted" && e.requestId === requestId) return e.content;
      if (e.type === "human-decision-submitted" && e.requestId === requestId) return e.content;
    }
  }
  return null;
}

/**
 * Returns the first valid action from a game type's action schema as a fallback
 * when a human player's turn times out.
 */
function getDefaultAction(gameType: GameType): Record<string, unknown> {
  // Parse the schema to get its shape; extract the first enum value if present
  const shape = (gameType.actionSchema as { shape?: Record<string, unknown> }).shape;
  if (shape) {
    for (const [key, field] of Object.entries(shape)) {
      const f = field as { _def?: { values?: string[] } };
      if (f._def?.values && f._def.values.length > 0) {
        return { [key]: f._def.values[0] };
      }
    }
  }
  return {};
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

      ctx.logger.info({ msg: "Generating discussion message", roundId, turn, personaId: personaSession.personaId, isHuman: personaSession.isHuman });

      // ── Human player: emit pending event and wait for UI submission ──────
      if (personaSession.isHuman) {
        const requestId = crypto.randomUUID();
        const expiresAt = Date.now() + 30_000;
        timeline.push({ type: "human-discussion-pending", round: roundId, requestId, expiresAt });
        await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });

        const result = await waitForHumanInput(ctx.gameSessionToken, requestId, 30_000);
        const content = typeof result === "string" && result.trim() ? result.trim() : "(said nothing)";

        timeline.push({ type: "persona-discussion", personaId: HUMAN_PLAYER_ID, personaName: personaSession.personaName, reasoning: null, content, round: roundId });
        await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });
        continue;
      }

      // ── AI player: generate via LLM ──────────────────────────────────────
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
 * Decision phase: players make decisions either sequentially or in parallel.
 * - Sequential (gameType.sequential=true): Players act one-by-one in random order,
 *   each seeing prior decisions. Used for turn-based games like Ultimatum Game.
 * - Parallel (default): All players decide simultaneously from a shared snapshot.
 */
async function runDecisionPhase(
  timeline: GameTimeline,
  gameType: GameType,
  personaSessions: GamePersonaSession[],
  participants: GameSessionParticipant[],
  roundId: number,
  ctx: PhaseContext,
) {
  ctx.logger.info({ msg: "Starting decision phase", roundId, sequential: gameType.sequential, players: personaSessions.map((p) => p.personaId) });

  if (gameType.sequential) {
    // Sequential execution: players act one by one in random order
    const shuffled = shuffle(personaSessions);

    for (const personaSession of shuffled) {
      if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

      // ── Human player turn ─────────────────────────────────────────────
      if (personaSession.isHuman) {
        const requestId = crypto.randomUUID();
        const expiresAt = Date.now() + 30_000;
        timeline.push({ type: "human-decision-pending", round: roundId, requestId, expiresAt });
        await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });

        const result = await waitForHumanInput(ctx.gameSessionToken, requestId, 30_000);
        const content = (typeof result === "object" && result !== null) ? result : getDefaultAction(gameType);

        timeline.push({ type: "persona-decision", personaId: HUMAN_PLAYER_ID, personaName: personaSession.personaName, reasoning: null, content, round: roundId });
        await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });
        continue;
      }

      // ── AI player turn ────────────────────────────────────────────────
      const context = formatTimelineForDecision(timeline, personaSession.personaId, participants, roundId, false);
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

      // Append immediately so next player sees it
      timeline.push({
        type: "persona-decision",
        personaId: personaSession.personaId,
        personaName: personaSession.personaName,
        reasoning,
        content,
        round: roundId
      });
      await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });
    }
  } else {
    // Parallel execution: all players decide simultaneously from shared snapshot.
    // Human is handled separately (pending→wait), AI players run in parallel.
    const snapshot = [...timeline];
    const aiSessions = personaSessions.filter((p) => !p.isHuman);
    const humanSession = personaSessions.find((p) => p.isHuman);

    // Start AI decisions in parallel
    const aiResultsPromise = Promise.all(
      aiSessions.map(async (personaSession) => {
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

    // Start human turn in parallel with AI (emit pending immediately)
    let humanResult: { reasoning: null; content: Record<string, unknown> } | undefined;
    let humanPendingRequestId: string | undefined;
    let humanExpiresAt = 0;
    if (humanSession) {
      const requestId = crypto.randomUUID();
      humanPendingRequestId = requestId;
      humanExpiresAt = Date.now() + 30_000;
      timeline.push({ type: "human-decision-pending", round: roundId, requestId, expiresAt: humanExpiresAt });
      await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });
    }

    // Await AI first
    const aiResults = await aiResultsPromise;

    // Then wait for human (using remaining time from expiresAt so countdown stays honest)
    if (humanSession && humanPendingRequestId) {
      const remaining = humanExpiresAt - Date.now();
      const result = remaining > 0 ? await waitForHumanInput(ctx.gameSessionToken, humanPendingRequestId, remaining) : null;
      const content = (typeof result === "object" && result !== null) ? result : getDefaultAction(gameType);
      humanResult = { reasoning: null, content };
    }

    // Append in original player order for a deterministic timeline
    const aiResultMap = new Map(aiResults.map((r) => [r.personaSession.personaId, r]));
    for (const personaSession of personaSessions) {
      if (personaSession.isHuman && humanResult) {
        timeline.push({ type: "persona-decision", personaId: HUMAN_PLAYER_ID, personaName: personaSession.personaName, reasoning: null, content: humanResult.content, round: roundId });
      } else {
        const r = aiResultMap.get(personaSession.personaId);
        if (r) {
          timeline.push({ type: "persona-decision", personaId: r.personaSession.personaId, personaName: r.personaSession.personaName, reasoning: r.reasoning, content: r.content, round: roundId });
        }
      }
    }

    await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });
  }

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
  const sessionExtra = session.extra as GameSessionExtra;

  // participants is the source of truth (already stored in extra at launch, includes human slot)
  const participants: GameSessionParticipant[] = sessionExtra.participants ?? [];

  // Load AI personas (those with positive personaIds)
  const aiPersonaIds = participants.filter((p) => p.personaId > 0).map((p) => p.personaId);
  const personasUnordered = await prisma.persona.findMany({ where: { id: { in: aiPersonaIds } } });

  if (personasUnordered.length !== aiPersonaIds.length) {
    throw new Error(`Some personas not found. Expected ${aiPersonaIds.length}, got ${personasUnordered.length}`);
  }

  const personaMap = new Map(personasUnordered.map((p) => [p.id, p]));
  const personaModels = sessionExtra.personaModels ?? {};

  // Build personaSessions in the same order as participants
  const personaSessions: GamePersonaSession[] = participants.map((p) => {
    if (p.personaId === HUMAN_PLAYER_ID) {
      return {
        personaId: HUMAN_PLAYER_ID,
        personaName: p.name,
        systemPrompt: "",
        modelName: "gemini-3-flash",
        isHuman: true,
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

  // Keep participants as stored in extra (preserves human slot and name)
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
