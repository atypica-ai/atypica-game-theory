import "server-only";

import { GameType } from "../gameTypes/types";
import {
  GamePersonaSession,
  GameSessionParticipant,
  GameTimeline,
} from "../types";
import { shouldTerminate } from "./helpers";
import { calculateRoundPayoffs } from "./payoff";
import { saveGameTimeline } from "./persistence";
import { PhaseContext } from "./phases";
import { failGameSessionRun } from "./runtime";

// ── Player handler interface ────────────────────────────────────────────────

/**
 * Abstracts the difference between AI-only and human-aware game sessions.
 * The game loop calls these methods without knowing whether players are human or AI.
 */
export interface PlayerHandler {
  /**
   * Run the discussion phase for one round.
   * Returns the (possibly refreshed) timeline.
   */
  runDiscussionPhase(
    timeline: GameTimeline,
    gameType: GameType,
    personaSessions: GamePersonaSession[],
    participants: GameSessionParticipant[],
    roundId: number,
    ctx: PhaseContext,
  ): Promise<GameTimeline>;

  /**
   * Run the decision phase for one round.
   * Returns the (possibly refreshed) timeline.
   */
  runDecisionPhase(
    timeline: GameTimeline,
    gameType: GameType,
    personaSessions: GamePersonaSession[],
    participants: GameSessionParticipant[],
    roundId: number,
    ctx: PhaseContext,
  ): Promise<GameTimeline>;
}

// ── Shared game loop ────────────────────────────────────────────────────────

export interface GameLoopParams {
  handler: PlayerHandler;
  gameSessionToken: string;
  gameType: GameType;
  personaSessions: GamePersonaSession[];
  participants: GameSessionParticipant[];
  initialTimeline: GameTimeline;
  ctx: PhaseContext;
}

/**
 * The shared game loop — runs rounds until termination condition is met.
 * Both AI-only and human-aware games use this; they differ only in the
 * PlayerHandler passed in.
 */
export async function runGameLoop({
  handler,
  gameSessionToken,
  gameType,
  personaSessions,
  participants,
  initialTimeline,
  ctx,
}: GameLoopParams): Promise<GameTimeline> {
  const { abortSignal, logger, discussionRounds } = ctx;

  let timeline = initialTimeline;
  let roundId = 1;

  try {
    while (true) {
      if (abortSignal.aborted) throw new Error("Game session aborted");

      logger.info({ msg: "Starting game round", roundId, gameType: gameType.name });

      const roundAnnouncement = `Round ${roundId} begins. ${discussionRounds > 0 ? "Discussion phase: each player may speak freely before deciding." : "Each player must now make their decision."}`;

      timeline.push({ type: "system", content: roundAnnouncement, round: roundId });
      await saveGameTimeline({ token: gameSessionToken, timeline, logger });

      if (discussionRounds > 0) {
        timeline = await handler.runDiscussionPhase(timeline, gameType, personaSessions, participants, roundId, ctx);
      }

      timeline = await handler.runDecisionPhase(timeline, gameType, personaSessions, participants, roundId, ctx);

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
        content: `Round ${roundId} results — ${payoffSummary}`,
        round: roundId,
      });

      logger.info({ msg: "Round completed", roundId, payoffs });
      await saveGameTimeline({ token: gameSessionToken, timeline, logger });

      if (shouldTerminate(gameType.horizon, roundId, timeline)) break;
      roundId++;
    }

    timeline.push({ type: "system", content: "Game complete." });
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
