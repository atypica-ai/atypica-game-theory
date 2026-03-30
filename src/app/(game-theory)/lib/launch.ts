import "server-only";

import { after } from "next/server";
import type { StatReporter } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { getGameType } from "../gameTypes";
import { GameSessionExtra } from "../types";
import { runGameSession } from "./orchestration";
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
  opts?: { useAfter?: boolean },
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
  const initialExtra: GameSessionExtra = { gameType: gameTypeName, participants };

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
