import "server-only";

import { after } from "next/server";
import type { StatReporter } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { getGameType } from "../gameTypes";
import { GameSessionExtra, HUMAN_PLAYER_ID } from "../types";
import { runGameSession } from "./orchestration";
import { saveGameTimeline } from "./persistence";
import { assignRandomPersonaModels } from "./personaModels";
import { startGameSessionRun } from "./runtime";

/**
 * Validates, creates a GameSession DB record, atomically locks it as "running",
 * then kicks off runGameSession.
 *
 * - HTTP/server action context (`useAfter: true`, default): wraps execution in
 *   next/server `after()` so the game survives after the response is sent.
 * - Script/CLI context (`useAfter: false`): returns `run` — a promise the
 *   caller can await to track completion and print a summary.
 *
 * Throws on validation failure — no DB record is created in that case.
 */
export async function launchGameSession(
  gameTypeName: string,
  personaIds: number[],
  opts?: { useAfter?: boolean; discussionRounds?: number },
): Promise<{ token: string; run: Promise<void> }> {
  const useAfter = opts?.useAfter !== false; // default true

  const gameType = getGameType(gameTypeName); // throws on unknown type
  if (personaIds.length < gameType.minPlayers || personaIds.length > gameType.maxPlayers) {
    throw new Error(
      `${gameType.displayName} requires ${gameType.minPlayers}–${gameType.maxPlayers} players, got ${personaIds.length}`,
    );
  }

  const personas = await prisma.persona.findMany({
    where: { id: { in: personaIds } },
    select: { id: true, name: true },
  });
  const personaMap = new Map(personas.map((p) => [p.id, p]));
  const participants = personaIds.map((id) => ({
    personaId: id,
    name: personaMap.get(id)?.name ?? `Persona ${id}`,
  }));

  const token = generateToken(16);
  const personaModels = assignRandomPersonaModels(personaIds);
  const initialExtra: GameSessionExtra = {
    gameType: gameTypeName,
    participants,
    personaModels,
    ...(opts?.discussionRounds !== undefined ? { discussionRounds: opts.discussionRounds } : {}),
  };

  await prisma.gameSession.create({
    data: {
      token,
      gameType: gameTypeName,
      personaIds,
      timeline: [],
      extra: initialExtra as object,
      status: "pending",
    },
  });

  // Atomically transition pending → running. Throws if already running/finished.
  await startGameSessionRun(token);

  const noopStatReport: StatReporter = async () => {};
  const logger = rootLogger.child({ gameSessionToken: token, gameType: gameTypeName });

  const runPromise: Promise<void> = runGameSession({
    gameSessionToken: token,
    locale: "en-US",
    abortSignal: new AbortController().signal,
    statReport: noopStatReport,
    logger,
  })
    .then(() => undefined)
    .catch((err: Error) => {
      // failGameSessionRun is already called inside runGameSession's catch block.
      // This outer catch prevents unhandled-rejection noise in after() context.
      logger.error({ msg: "Game session run failed (outer catch)", error: err.message });
    });

  if (useAfter) {
    after(runPromise);
  }

  return { token, run: runPromise };
}

/**
 * Creates a human game session. The human takes the first slot; remaining slots
 * are filled with random AI personas. Timeline is initialized with rules prompt.
 *
 * Unlike AI-only games, NO background orchestration is started. The frontend
 * drives the game loop via individual server action calls (frontend-powered model).
 */
export async function launchHumanGameSession(
  gameTypeName: string,
  humanUserId: number,
  humanUserName: string,
  opts?: { discussionRounds?: number },
): Promise<{ token: string }> {
  const gameType = getGameType(gameTypeName);
  const aiCount = gameType.minPlayers - 1; // human takes 1 slot

  if (aiCount < 1) {
    throw new Error(`${gameType.displayName} requires at least 2 players to support a human participant`);
  }

  // Pick random AI personas from the most recent pool
  const pool = await prisma.persona.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (pool.length < aiCount) {
    throw new Error(`Not enough personas available (need ${aiCount}, found ${pool.length})`);
  }

  // Shuffle and take aiCount
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, aiCount);
  const aiPersonaIds = shuffled.map((p) => p.id);

  // Build participants: human first, then AI personas
  const participants: GameSessionExtra["participants"] = [
    { personaId: HUMAN_PLAYER_ID, name: humanUserName, userId: humanUserId },
    ...shuffled.map((p) => ({ personaId: p.id, name: p.name })),
  ];

  const token = generateToken(16);
  const personaModels = assignRandomPersonaModels(aiPersonaIds);
  const initialExtra: GameSessionExtra = {
    gameType: gameTypeName,
    participants,
    personaModels,
    ...(opts?.discussionRounds !== undefined ? { discussionRounds: opts.discussionRounds } : {}),
  };

  await prisma.gameSession.create({
    data: {
      token,
      gameType: gameTypeName,
      personaIds: aiPersonaIds,
      timeline: [],
      extra: initialExtra as object,
      status: "pending",
    },
  });

  await startGameSessionRun(token);

  // Initialize timeline with rules prompt — frontend drives everything after this
  const logger = rootLogger.child({ gameSessionToken: token, gameType: gameTypeName, humanUserId });
  await saveGameTimeline({
    token,
    timeline: [{ type: "system", content: gameType.rulesPrompt }],
    status: "running",
    extra: initialExtra,
    logger,
  });

  return { token };
}
