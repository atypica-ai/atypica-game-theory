import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { launchGameSession } from "@/app/(game-theory)/lib/launch";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import type { BaseLogger } from "pino";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

function validateInternalAuth(request: NextRequest): boolean {
  return request.headers.get("x-internal-secret") === process.env.INTERNAL_API_SECRET;
}

const bodySchema = z.object({
  count: z.number().int().min(1).max(50).default(1),
});

const ALL_GAME_TYPES = Object.values(gameTypeRegistry);

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function pickRandomPersonaIds(count: number): Promise<number[]> {
  const personas = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM "Persona" ORDER BY RANDOM() LIMIT ${count}
  `;
  return personas.map((p) => p.id);
}

/** 60% no discussion, 40% randomly 1–3 rounds */
function randomDiscussionRounds(): number | undefined {
  if (Math.random() < 0.6) return undefined;
  return randomInt(1, 3);
}

async function launchRandomSession(index: number, logger: BaseLogger) {
  const gameType = ALL_GAME_TYPES[Math.floor(Math.random() * ALL_GAME_TYPES.length)];
  const playerCount = randomInt(gameType.minPlayers, gameType.maxPlayers);
  const personaIds = await pickRandomPersonaIds(playerCount);

  if (personaIds.length < gameType.minPlayers) {
    throw new Error(
      `Not enough personas in DB: need ${gameType.minPlayers}, got ${personaIds.length}`,
    );
  }

  const discussionRounds = randomDiscussionRounds();
  const { token } = await launchGameSession(gameType.name, personaIds, { discussionRounds });

  logger.info({
    msg: "Random game session launched",
    index,
    token,
    gameType: gameType.name,
    playerCount,
    discussionRounds: discussionRounds ?? "(game default)",
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = rootLogger.child({ api: "game-run-random" });

  if (!validateInternalAuth(request)) {
    logger.warn({ msg: "Unauthorized access attempt to game-run-random API" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { count } = parsed.data;

  after(async () => {
    logger.info({ msg: "Random game run job started", count });
    let succeeded = 0;
    let failed = 0;

    await Promise.all(
      Array.from({ length: count }, async (_, i) => {
        try {
          await launchRandomSession(i, logger);
          succeeded++;
        } catch (error) {
          failed++;
          logger.error({ msg: "Random session launch failed", index: i, error: (error as Error).message });
        }
      }),
    );

    logger.info({ msg: "Random game run job completed", count, succeeded, failed });
  });

  return NextResponse.json(
    {
      success: true,
      status: "processing",
      count,
      message: `Launching ${count} fully-random session(s) in background.`,
      timestamp: new Date().toISOString(),
    },
    { status: 202 },
  );
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
