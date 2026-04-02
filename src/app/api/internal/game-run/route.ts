import { gameTypeRegistry, getGameType } from "@/app/(game-theory)/gameTypes";
import { launchGameSession } from "@/app/(game-theory)/lib/launch";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

function validateInternalAuth(request: NextRequest): boolean {
  return request.headers.get("x-internal-secret") === process.env.INTERNAL_API_SECRET;
}

const bodySchema = z
  .object({
    gameType: z.string().min(1),
    personaIds: z.array(z.number().int().positive()).min(1).optional(),
    randomPersonaCount: z.number().int().min(1).optional(),
    sessions: z.number().int().min(1).max(20).default(1),
    discussionRounds: z.number().int().min(0).optional(),
  })
  .refine((d) => d.personaIds !== undefined || d.randomPersonaCount !== undefined, {
    message: "Either personaIds or randomPersonaCount is required",
  });

async function pickRandomPersonaIds(count: number): Promise<number[]> {
  const personas = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM "Persona" ORDER BY RANDOM() LIMIT ${count}
  `;
  return personas.map((p) => p.id);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = rootLogger.child({ api: "game-run" });

  if (!validateInternalAuth(request)) {
    logger.warn({ msg: "Unauthorized access attempt to game-run API" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { gameType, personaIds, randomPersonaCount, sessions, discussionRounds } = parsed.data;

  // Validate game type early so we can return a clean 400 before queuing
  try {
    getGameType(gameType);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  after(async () => {
    logger.info({ msg: "Game run job started", gameType, sessions, randomPersonaCount });

    await Promise.all(
      Array.from({ length: sessions }, async (_, i) => {
        try {
          const ids =
            personaIds ??
            (await pickRandomPersonaIds(
              randomPersonaCount ?? getGameType(gameType).minPlayers,
            ));
          const { token } = await launchGameSession(gameType, ids, { discussionRounds });
          logger.info({ msg: "Game session launched", token, gameType, personaIds: ids, index: i });
        } catch (error) {
          const message = (error as Error).message;
          logger.error({ msg: "Game session launch failed", gameType, index: i, error: message });
        }
      }),
    );

    logger.info({ msg: "Game run job completed", gameType, sessions });
  });

  return NextResponse.json(
    {
      success: true,
      status: "processing",
      gameType,
      sessions,
      message: `Launching ${sessions} session(s) of ${gameType} in background.`,
      timestamp: new Date().toISOString(),
    },
    { status: 202 },
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const logger = rootLogger.child({ api: "game-run" });

  if (!validateInternalAuth(request)) {
    logger.warn({ msg: "Unauthorized access attempt to game-run API" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gameTypes = Object.values(gameTypeRegistry).map((gt) => ({
    name: gt.name,
    displayName: gt.displayName,
    minPlayers: gt.minPlayers,
    maxPlayers: gt.maxPlayers,
  }));

  return NextResponse.json({ gameTypes });
}
