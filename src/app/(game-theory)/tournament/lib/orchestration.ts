import "server-only";

import type { StatReporter } from "@/ai/tools/types";
import { generateToken } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { GameSessionExtra } from "../../types";
import { runGameSession } from "../../lib/orchestration";
import { startGameSessionRun } from "../../lib/runtime";
import { TournamentState, TournamentStageState } from "../types";
import { calculateStageAdvancing } from "./advancement";
import { distributeIntoGroups } from "./grouping";
import { saveTournamentState } from "./persistence";
import { failTournamentRun } from "./runtime";

// ── Stage constants ──────────────────────────────────────────────────────────

const STAGE_1 = { stageNumber: 1, gameTypeName: "stag-hunt", groupSize: 10, advanceCount: 20, concurrency: 3 };
const STAGE_2 = { stageNumber: 2, gameTypeName: "golden-ball", groupSize: 5, advanceCount: 4, concurrency: 5 };
const STAGE_3 = { stageNumber: 3, gameTypeName: "beauty-contest" };

// ── Internal helpers ─────────────────────────────────────────────────────────

interface RunContext {
  tournamentToken: string;
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
}

/**
 * Creates a GameSession DB record and atomically transitions it to "running".
 */
async function createGroupSession(gameTypeName: string, personaIds: number[]): Promise<string> {
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
  await startGameSessionRun(token); // pending → running
  return token;
}

/**
 * Runs `runFn` on each token, at most `concurrency` at a time.
 */
async function runBatched(
  tokens: string[],
  concurrency: number,
  runFn: (token: string) => Promise<void>,
): Promise<void> {
  const queue = [...tokens];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const token = queue.shift();
      if (!token) break;
      await runFn(token);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tokens.length) }, worker));
}

/**
 * Runs one tournament stage end-to-end:
 * groups players → creates sessions → saves state → runs sessions → ranks stage-wide → advances top N.
 * Returns the IDs of advancing players.
 */
async function runStage(
  stageNumber: number,
  gameTypeName: string,
  groupSize: number,
  advanceCount: number,
  concurrency: number,
  personaIds: number[],
  state: TournamentState,
  ctx: RunContext,
): Promise<number[]> {
  ctx.logger.info({ msg: "Tournament stage starting", stageNumber, gameTypeName, players: personaIds.length });

  const groups = distributeIntoGroups(personaIds, groupSize);
  const gameSessionTokens = await Promise.all(
    groups.map((ids) => createGroupSession(gameTypeName, ids)),
  );

  const stageState: TournamentStageState = {
    stageNumber,
    status: "running",
    gameSessionTokens,
    advancingPersonaIds: [],
  };
  state.stages.push(stageState);
  await saveTournamentState({ token: ctx.tournamentToken, state, logger: ctx.logger });

  await runBatched(gameSessionTokens, concurrency, (token) =>
    runGameSession({
      gameSessionToken: token,
      locale: ctx.locale,
      abortSignal: ctx.abortSignal,
      statReport: ctx.statReport,
      logger: ctx.logger.child({ gameSessionToken: token }),
    }).then(() => undefined),
  );

  const advancingPersonaIds = await calculateStageAdvancing(gameSessionTokens, advanceCount);
  stageState.advancingPersonaIds = advancingPersonaIds;
  stageState.status = "completed";
  await saveTournamentState({ token: ctx.tournamentToken, state, logger: ctx.logger });

  ctx.logger.info({ msg: "Tournament stage completed", stageNumber, advancing: advancingPersonaIds.length });
  return advancingPersonaIds;
}

// ── Main entry ───────────────────────────────────────────────────────────────

/**
 * Runs the full tournament:
 *   Stage 1: Stag Hunt   — 100 players, groups of 10, top 20 advance
 *   Stage 2: Golden Ball — ~20 players, groups of ~5, top 4 advance
 *   Stage 3: Beauty Contest — all remaining (~4) in one group, champion wins
 */
export async function runTournament({
  tournamentToken,
  locale,
  abortSignal,
  statReport,
  logger,
}: RunContext): Promise<void> {
  const tournament = await prisma.tournament.findUniqueOrThrow({ where: { token: tournamentToken } });
  const initialPersonaIds = tournament.personaIds as number[];
  const state: TournamentState = { stages: [] };
  const ctx: RunContext = { tournamentToken, locale, abortSignal, statReport, logger };

  try {
    // Stage 1 — Stag Hunt
    const stage2Players = await runStage(
      STAGE_1.stageNumber, STAGE_1.gameTypeName, STAGE_1.groupSize, STAGE_1.advanceCount, STAGE_1.concurrency,
      initialPersonaIds, state, ctx,
    );

    // Stage 2 — Golden Ball
    const stage3Players = await runStage(
      STAGE_2.stageNumber, STAGE_2.gameTypeName, STAGE_2.groupSize, STAGE_2.advanceCount, STAGE_2.concurrency,
      stage2Players, state, ctx,
    );

    // Stage 3 — Beauty Contest (single group, no advancement)
    const finalToken = await createGroupSession(STAGE_3.gameTypeName, stage3Players);
    const finalStageState: TournamentStageState = {
      stageNumber: STAGE_3.stageNumber,
      status: "running",
      gameSessionTokens: [finalToken],
      advancingPersonaIds: [],
    };
    state.stages.push(finalStageState);
    await saveTournamentState({ token: tournamentToken, state, logger });

    await runGameSession({
      gameSessionToken: finalToken,
      locale,
      abortSignal,
      statReport,
      logger: logger.child({ gameSessionToken: finalToken }),
    });

    finalStageState.status = "completed";
    await saveTournamentState({ token: tournamentToken, state, status: "completed", logger });

    logger.info({ msg: "Tournament completed", tournamentToken });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ msg: "Tournament failed", error: error.message });
    await failTournamentRun(tournamentToken, error).catch((dbErr) =>
      logger.error({ msg: "Failed to record tournament failure", error: (dbErr as Error).message }),
    );
    throw error;
  }
}
