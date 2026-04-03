import { gameTypeRegistry } from "@/app/(game-theory)/gameTypes";
import { launchGameSession } from "@/app/(game-theory)/lib/launch";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";

const ALL_GAME_TYPES = Object.values(gameTypeRegistry);

function validateCronAuth(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

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

async function launchRandomSession(index: number, logger: ReturnType<typeof rootLogger.child>) {
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const logger = rootLogger.child({ api: "cron/game-run-random" });

  if (!validateCronAuth(request)) {
    logger.warn({ msg: "Unauthorized cron request to game-run-random" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    logger.info({ msg: "Cron game-run-random started" });
    try {
      await launchRandomSession(0, logger);
      logger.info({ msg: "Cron game-run-random completed" });
    } catch (error) {
      logger.error({
        msg: "Cron game-run-random failed",
        error: (error as Error).message,
      });
    }
  });

  return NextResponse.json(
    {
      success: true,
      status: "processing",
      message: "Launching 1 random game session in background.",
      timestamp: new Date().toISOString(),
    },
    { status: 202 },
  );
}
