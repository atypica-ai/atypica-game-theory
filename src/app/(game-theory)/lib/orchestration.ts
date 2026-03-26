import "server-only";

import { StatReporter } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { getGameType } from "../gameTypes";
import { Horizon } from "../gameTypes/types";
import { GamePersonaSession, GameSessionMeta, GameSessionTimeline, RoundRecord } from "../types";
import { buildGamePersonaSession, generatePlayerMove } from "./generation";
import { calculateRoundPayoffs } from "./payoff";
import { saveGameTimeline } from "./persistence";

function shouldTerminate(horizon: Horizon, roundId: number, timeline: GameSessionTimeline): boolean {
  switch (horizon.type) {
    case "fixed":
      return roundId >= horizon.rounds;
    case "condition":
      return horizon.shouldTerminate(timeline);
    case "indefinite":
      return roundId >= horizon.maxRounds;
  }
}

/**
 * Main game loop. Runs all rounds of a game session, persisting the timeline after each player's move.
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
}): Promise<GameSessionTimeline> {
  // Load game session from DB
  const session = await prisma.gameSession.findUniqueOrThrow({
    where: { token: gameSessionToken },
  });

  const gameType = getGameType(session.gameType);
  const personaIds = session.personaIds as number[];

  // Load personas
  const personas = await prisma.persona.findMany({
    where: { id: { in: personaIds } },
  });

  if (personas.length !== personaIds.length) {
    throw new Error(
      `Some personas not found. Expected ${personaIds.length}, got ${personas.length}`,
    );
  }

  // Assign player IDs in order
  const playerIds = personaIds.map((_, i) => `player_${String.fromCharCode(65 + i)}`); // player_A, player_B, ...

  const personaSessions: GamePersonaSession[] = personas.map((persona, i) =>
    buildGamePersonaSession({ persona, playerId: playerIds[i], locale }),
  );

  const meta: GameSessionMeta = {
    gameType: session.gameType,
    participants: personas.map((p, i) => ({
      personaId: p.id,
      name: p.name,
      playerId: playerIds[i],
    })),
  };

  // Initialize timeline
  const timeline: GameSessionTimeline = {
    meta,
    system: gameType.rulesPrompt,
    rounds: [],
  };

  // Mark as running
  await saveGameTimeline({ token: gameSessionToken, timeline, status: "running", logger });

  let roundId = 1;

  while (true) {
    if (abortSignal.aborted) {
      throw new Error("Game session aborted");
    }

    logger.info({ msg: "Starting game round", roundId, gameType: session.gameType });

    // Initialize round record
    const round: RoundRecord = {
      roundId,
      system:
        locale === "zh-CN"
          ? `第 ${roundId} 轮开始。每位玩家请做出本轮决策。`
          : `Round ${roundId} begins. Each player must now make their decision.`,
      players: {},
      payoffs: {},
    };

    // Add round to timeline (with empty players) so frontend shows it started
    timeline.rounds.push(round);
    await saveGameTimeline({ token: gameSessionToken, timeline, logger });

    // Each player acts sequentially
    for (const personaSession of personaSessions) {
      if (abortSignal.aborted) {
        throw new Error("Game session aborted");
      }

      const playerRecord = await generatePlayerMove({
        personaSession,
        gameType,
        timeline,
        locale,
        abortSignal,
        statReport,
        logger: logger.child({ playerId: personaSession.playerId }),
      });

      round.players[personaSession.playerId] = playerRecord;

      // Persist after each player so frontend can show partial round progress
      await saveGameTimeline({ token: gameSessionToken, timeline, logger });
    }

    // Calculate payoffs for this round
    round.payoffs = calculateRoundPayoffs(gameType, round.players);

    logger.info({
      msg: "Round completed",
      roundId,
      payoffs: round.payoffs,
    });

    // Persist final round state with payoffs
    await saveGameTimeline({ token: gameSessionToken, timeline, logger });

    // Check termination
    if (shouldTerminate(gameType.horizon, roundId, timeline)) {
      break;
    }

    roundId++;
  }

  // Mark as completed
  await saveGameTimeline({ token: gameSessionToken, timeline, status: "completed", logger });

  logger.info({ msg: "Game session completed", rounds: timeline.rounds.length });

  return timeline;
}
