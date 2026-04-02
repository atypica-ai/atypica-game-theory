import "server-only";

import { after } from "next/server";
import type { StatReporter } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { runTournament } from "./orchestration";
import { startTournamentRun } from "./runtime";

// Stage 1 is Stag Hunt which requires exactly 10 players per group of 100.
const REQUIRED_PLAYER_COUNT = 100;

/**
 * Validates player count, creates the Tournament DB record, atomically locks it
 * as "running", then kicks off runTournament.
 *
 * - HTTP/server action context (`useAfter: true`, default): wraps execution in
 *   next/server `after()` so the tournament survives after the response is sent.
 * - Script/CLI context (`useAfter: false`): returns `run` — a promise the
 *   caller can await.
 *
 * Throws on validation failure — no DB record is created in that case.
 */
export async function launchTournament(
  personaIds: number[],
  opts?: { useAfter?: boolean },
): Promise<{ token: string; run: Promise<void> }> {
  const useAfter = opts?.useAfter !== false; // default true

  if (personaIds.length !== REQUIRED_PLAYER_COUNT) {
    throw new Error(
      `Tournament requires exactly ${REQUIRED_PLAYER_COUNT} players, got ${personaIds.length}`,
    );
  }

  const token = generateToken(16);

  await prisma.tournament.create({
    data: {
      token,
      personaIds,
      state: { stages: [] },
      status: "pending",
      extra: {},
    },
  });

  await startTournamentRun(token);

  const noopStatReport: StatReporter = async () => {};
  const logger = rootLogger.child({ tournamentToken: token });

  const runPromise: Promise<void> = runTournament({
    tournamentToken: token,
    locale: "en-US",
    abortSignal: new AbortController().signal,
    statReport: noopStatReport,
    logger,
  }).catch((err: Error) => {
    // failTournamentRun is already called inside runTournament's catch block.
    // This outer catch prevents unhandled-rejection noise in after() context.
    logger.error({ msg: "Tournament run failed (outer catch)", error: err.message });
  });

  if (useAfter) {
    after(runPromise);
  }

  return { token, run: runPromise };
}
