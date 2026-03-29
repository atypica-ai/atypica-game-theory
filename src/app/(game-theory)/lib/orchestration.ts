import "server-only";

import { StatReporter } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { getGameType } from "../gameTypes";
import { Horizon } from "../gameTypes/types";
import { GameSessionExtra, GameTimeline } from "../types";
import { buildGamePersonaSession, generatePlayerDecision, generatePlayerDiscussion } from "./generation";
import { formatTimelineForDecision, formatTimelineForDiscussion } from "./formatting";
import { calculateRoundPayoffs } from "./payoff";
import { saveGameTimeline } from "./persistence";

// ── Termination check ────────────────────────────────────────────────────────

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

// ── Fisher-Yates shuffle (in-place) ─────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Main game loop ───────────────────────────────────────────────────────────

/**
 * Main game loop. Runs all rounds of a game session, persisting the timeline after
 * each player's action so the frontend can poll for live progress.
 * Called from playGameTool (or createGameSession) after the GameSession record is created.
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

  // Load personas and preserve the personaIds order (findMany does not guarantee order)
  const personasUnordered = await prisma.persona.findMany({
    where: { id: { in: personaIds } },
  });

  if (personasUnordered.length !== personaIds.length) {
    throw new Error(
      `Some personas not found. Expected ${personaIds.length}, got ${personasUnordered.length}`,
    );
  }

  const personaMap = new Map(personasUnordered.map((p) => [p.id, p]));
  const personas = personaIds.map((id) => personaMap.get(id)!);

  const personaSessions = personas.map((persona) =>
    buildGamePersonaSession({ persona, locale }),
  );

  // Participants list — stored in extra, not timeline
  const participants: GameSessionExtra["participants"] = personas.map((p) => ({
    personaId: p.id,
    name: p.name,
  }));

  const extra: GameSessionExtra = {
    gameType: session.gameType,
    participants,
  };

  // Initialize the flat timeline
  const timeline: GameTimeline = [];

  // Game-level rules announcement (no round)
  timeline.push({ type: "system", content: gameType.rulesPrompt });

  // Mark as running and store participants in extra
  await saveGameTimeline({ token: gameSessionToken, timeline, status: "running", extra, logger });

  let roundId = 1;

  while (true) {
    if (abortSignal.aborted) {
      throw new Error("Game session aborted");
    }

    logger.info({ msg: "Starting game round", roundId, gameType: session.gameType });

    // Round-level system announcement
    const roundAnnouncement =
      locale === "zh-CN"
        ? `第 ${roundId} 轮开始。${gameType.discussionRounds > 0 ? "讨论阶段开始，每位玩家可以自由发言。" : "每位玩家请做出本轮决策。"}`
        : `Round ${roundId} begins. ${gameType.discussionRounds > 0 ? "Discussion phase: each player may speak freely before deciding." : "Each player must now make their decision."}`;

    timeline.push({ type: "system", content: roundAnnouncement, round: roundId });
    await saveGameTimeline({ token: gameSessionToken, timeline, logger });

    // ── Discussion phase (optional) ─────────────────────────────────────────

    if (gameType.discussionRounds > 0) {
      logger.info({ msg: "Starting discussion phase", roundId, discussionRounds: gameType.discussionRounds });

      for (let turn = 0; turn < gameType.discussionRounds; turn++) {
        if (abortSignal.aborted) throw new Error("Game session aborted");

        // Randomize speaker order each turn for fairness
        const speakerOrder = shuffle(personaSessions);
        logger.info({ msg: "Discussion turn begin", roundId, turn, speakerOrder: speakerOrder.map((p) => p.personaId) });

        for (const personaSession of speakerOrder) {
          if (abortSignal.aborted) throw new Error("Game session aborted");

          logger.info({ msg: "Generating discussion message", roundId, turn, personaId: personaSession.personaId });

          const context = formatTimelineForDiscussion(
            timeline,
            personaSession.personaId,
            participants,
            roundId,
          );

          let reasoning: string | null;
          let content: string;
          try {
            ({ reasoning, content } = await generatePlayerDiscussion({
              personaSession,
              formattedContext: context,
              round: roundId,
              locale,
              abortSignal,
              statReport,
              logger: logger.child({ personaId: personaSession.personaId }),
            }));
          } catch (err) {
            logger.error({ msg: "Discussion generation failed", roundId, turn, personaId: personaSession.personaId, error: (err as Error).message });
            throw err;
          }

          timeline.push({
            type: "persona-discussion",
            personaId: personaSession.personaId,
            personaName: personaSession.personaName,
            reasoning,
            content,
            round: roundId,
          });

          await saveGameTimeline({ token: gameSessionToken, timeline, logger });
        }
      }

      logger.info({ msg: "Discussion phase complete", roundId });
    }

    // ── Decision phase ──────────────────────────────────────────────────────

    for (const personaSession of personaSessions) {
      if (abortSignal.aborted) throw new Error("Game session aborted");

      const context = formatTimelineForDecision(
        timeline,
        personaSession.personaId,
        participants,
        roundId,
        gameType.simultaneousReveal,
      );

      const { reasoning, content } = await generatePlayerDecision({
        personaSession,
        gameType,
        formattedContext: context,
        round: roundId,
        locale,
        abortSignal,
        statReport,
        logger: logger.child({ personaId: personaSession.personaId }),
      });

      timeline.push({
        type: "persona-decision",
        personaId: personaSession.personaId,
        personaName: personaSession.personaName,
        reasoning,
        content,
        round: roundId,
      });

      // Persist after each player so frontend shows partial round progress
      await saveGameTimeline({ token: gameSessionToken, timeline, logger });
    }

    // ── Payoffs ─────────────────────────────────────────────────────────────

    const payoffs = calculateRoundPayoffs(gameType, timeline, roundId);

    timeline.push({ type: "round-result", round: roundId, payoffs });

    // Human-readable round summary
    const payoffSummary = Object.entries(payoffs)
      .map(([id, v]) => {
        const name = participants.find((p) => p.personaId === Number(id))?.name ?? `Player ${id}`;
        return `${name}: ${v}`;
      })
      .join(", ");
    timeline.push({
      type: "system",
      content:
        locale === "zh-CN"
          ? `第 ${roundId} 轮结果 — ${payoffSummary}`
          : `Round ${roundId} results — ${payoffSummary}`,
      round: roundId,
    });

    logger.info({ msg: "Round completed", roundId, payoffs });
    await saveGameTimeline({ token: gameSessionToken, timeline, logger });

    // ── Termination check ───────────────────────────────────────────────────

    if (shouldTerminate(gameType.horizon, roundId, timeline)) {
      break;
    }

    roundId++;
  }

  // Final system message
  timeline.push({
    type: "system",
    content: locale === "zh-CN" ? "游戏结束。" : "Game complete.",
  });

  await saveGameTimeline({ token: gameSessionToken, timeline, status: "completed", logger });

  logger.info({ msg: "Game session completed", totalRounds: roundId });

  return timeline;
}
