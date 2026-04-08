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
import { getDefaultAction, shouldTerminate, shuffle, sleep } from "./helpers";
import { calculateRoundPayoffs } from "./payoff";
import { refreshTimeline, saveGameTimeline } from "./persistence";
import { AIDecisionResult, generateAIDecision, generateAIDiscussionTurn, PhaseContext } from "./phases";
import { failGameSessionRun } from "./runtime";

// ── Human input polling ──────────────────────────────────────────────────────

/**
 * Poll the timeline every 1s until a human-*-submitted event with the given
 * requestId appears. Returns the submitted content, or null on timeout.
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

// ── Discussion phase (human-aware) ───────────────────────────────────────────

/**
 * Discussion phase for human-involved games. Speakers take turns in random order.
 * When it's the human's turn: emit pending, wait for submission, re-sync from DB.
 * When it's an AI's turn: generate via LLM.
 * Saves after each speaker for live frontend polling.
 */
async function runDiscussionPhase(
  timeline: GameTimeline,
  gameType: GameType,
  personaSessions: GamePersonaSession[],
  participants: GameSessionParticipant[],
  roundId: number,
  ctx: PhaseContext,
): Promise<void> {
  ctx.logger.info({ msg: "Starting discussion phase (human)", roundId, discussionRounds: ctx.discussionRounds });

  for (let turn = 0; turn < ctx.discussionRounds; turn++) {
    if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

    const speakerOrder = shuffle(personaSessions);

    for (const personaSession of speakerOrder) {
      if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

      if (personaSession.isHuman) {
        // ── Human speaker ──────────────────────────────────────────────
        const requestId = crypto.randomUUID();
        const expiresAt = Date.now() + 30_000;
        timeline.push({ type: "human-discussion-pending", round: roundId, requestId, expiresAt });
        await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });

        const result = await waitForHumanInput(ctx.gameSessionToken, requestId, 30_000);
        const content = typeof result === "string" && result.trim() ? result.trim() : "(said nothing)";

        // Re-sync from DB to preserve server action writes (human-discussion-submitted)
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

        // Update local reference so subsequent speakers see all events
        timeline.length = 0;
        timeline.push(...fresh);
      } else {
        // ── AI speaker ─────────────────────────────────────────────────
        await generateAIDiscussionTurn(timeline, personaSession, participants, roundId, ctx);
        await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });
      }
    }
  }

  ctx.logger.info({ msg: "Discussion phase complete (human)", roundId });
}

// ── Decision phase (human-aware) ─────────────────────────────────────────────

/**
 * Decision phase for human-involved games.
 *
 * Sequential mode: players act one by one. Human gets full 30s when it's their turn.
 * Parallel mode: human wait runs IN PARALLEL with AI, so human gets full 30s
 * regardless of AI speed (fixes the original timeout bug).
 */
async function runDecisionPhase(
  timeline: GameTimeline,
  gameType: GameType,
  personaSessions: GamePersonaSession[],
  participants: GameSessionParticipant[],
  roundId: number,
  ctx: PhaseContext,
): Promise<void> {
  ctx.logger.info({ msg: "Starting decision phase (human)", roundId, sequential: gameType.sequential });

  if (gameType.sequential) {
    const shuffled = shuffle(personaSessions);

    for (const personaSession of shuffled) {
      if (ctx.abortSignal.aborted) throw new Error("Game session aborted");

      if (personaSession.isHuman) {
        // ── Human turn (sequential) ──────────────────────────────────
        const requestId = crypto.randomUUID();
        const expiresAt = Date.now() + 30_000;
        timeline.push({ type: "human-decision-pending", round: roundId, requestId, expiresAt });
        await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });

        const result = await waitForHumanInput(ctx.gameSessionToken, requestId, 30_000);
        const content = (typeof result === "object" && result !== null) ? result : getDefaultAction(gameType);

        // Re-sync from DB to preserve server action writes
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
        timeline.length = 0;
        timeline.push(...fresh);
      } else {
        // ── AI turn (sequential) ─────────────────────────────────────
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
    }
  } else {
    // ── Parallel mode ────────────────────────────────────────────────────
    const snapshot = [...timeline];
    const aiSessions = personaSessions.filter((p) => !p.isHuman);
    const humanSession = personaSessions.find((p) => p.isHuman);

    // Start AI decisions in parallel
    const aiResultsPromise = Promise.all(
      aiSessions.map((s) => generateAIDecision(snapshot, s, gameType, participants, roundId, ctx)),
    );

    // Start human wait IN PARALLEL with AI (human gets full 30s)
    let humanResultPromise: Promise<Record<string, unknown>> | undefined;
    if (humanSession) {
      const requestId = crypto.randomUUID();
      const expiresAt = Date.now() + 30_000;
      timeline.push({ type: "human-decision-pending", round: roundId, requestId, expiresAt });
      await saveGameTimeline({ token: ctx.gameSessionToken, timeline, logger: ctx.logger });

      humanResultPromise = waitForHumanInput(ctx.gameSessionToken, requestId, 30_000)
        .then((result) => (typeof result === "object" && result !== null) ? result : getDefaultAction(gameType));
    }

    // Await both — human gets full 30s regardless of AI speed
    const [aiResults, humanContent] = await Promise.all([
      aiResultsPromise,
      humanResultPromise ?? Promise.resolve(undefined),
    ]);

    // Re-sync from DB to preserve server action writes (human-decision-submitted)
    const fresh = await refreshTimeline(ctx.gameSessionToken);

    // Append canonical persona-decision events in original player order
    const aiResultMap = new Map<number, AIDecisionResult>(aiResults.map((r) => [r.personaSession.personaId, r]));
    for (const personaSession of personaSessions) {
      if (personaSession.isHuman && humanContent) {
        fresh.push({
          type: "persona-decision",
          personaId: HUMAN_PLAYER_ID,
          personaName: personaSession.personaName,
          reasoning: null,
          content: humanContent,
          round: roundId,
        });
      } else {
        const r = aiResultMap.get(personaSession.personaId);
        if (r) {
          fresh.push({
            type: "persona-decision",
            personaId: r.personaSession.personaId,
            personaName: r.personaSession.personaName,
            reasoning: r.reasoning,
            content: r.content,
            round: roundId,
          });
        }
      }
    }

    await saveGameTimeline({ token: ctx.gameSessionToken, timeline: fresh, logger: ctx.logger });
    timeline.length = 0;
    timeline.push(...fresh);
  }

  ctx.logger.info({ msg: "Decision phase complete (human)", roundId });
}

// ── Main game loop (human-involved) ──────────────────────────────────────────

/**
 * Main game loop for human-involved sessions.
 *
 * Key differences from AI-only runGameSession:
 * 1. Human wait runs in parallel with AI (no timer starvation)
 * 2. Re-reads timeline from DB before saves (no server action overwrites)
 * 3. Discussion phase handles human turns with DB sync
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
  try {
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
    const ctx: PhaseContext = { gameSessionToken, locale, abortSignal, statReport, logger, discussionRounds };

    // Initialize timeline
    const timeline: GameTimeline = [];
    timeline.push({ type: "system", content: gameType.rulesPrompt });
    await saveGameTimeline({ token: gameSessionToken, timeline, status: "running", extra, logger });

    let roundId = 1;

    while (true) {
      if (abortSignal.aborted) throw new Error("Game session aborted");

      logger.info({ msg: "Starting game round (human)", roundId, gameType: session.gameType });

      const roundAnnouncement =
        locale === "zh-CN"
          ? `第 ${roundId} 轮开始。${discussionRounds > 0 ? "讨论阶段开始，每位玩家可以自由发言。" : "每位玩家请做出本轮决策。"}`
          : `Round ${roundId} begins. ${discussionRounds > 0 ? "Discussion phase: each player may speak freely before deciding." : "Each player must now make their decision."}`;

      timeline.push({ type: "system", content: roundAnnouncement, round: roundId });
      await saveGameTimeline({ token: gameSessionToken, timeline, logger });

      if (discussionRounds > 0) {
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

      logger.info({ msg: "Round completed (human)", roundId, payoffs });
      await saveGameTimeline({ token: gameSessionToken, timeline, logger });

      if (shouldTerminate(gameType.horizon, roundId, timeline)) break;
      roundId++;
    }

    timeline.push({ type: "system", content: locale === "zh-CN" ? "游戏结束。" : "Game complete." });
    await saveGameTimeline({ token: gameSessionToken, timeline, status: "completed", logger });

    logger.info({ msg: "Human game session completed", totalRounds: roundId });
    return timeline;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Human game session failed", error: error.message });
    await failGameSessionRun(gameSessionToken, error).catch((dbErr) =>
      logger.error({ msg: "Failed to record game session failure", error: (dbErr as Error).message }),
    );
    throw error;
  }
}
