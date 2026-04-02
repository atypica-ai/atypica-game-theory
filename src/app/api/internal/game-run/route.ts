import { launchGameSession } from "@/app/(game-theory)/lib/launch";
import { rootLogger } from "@/lib/logging";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

function validateInternalAuth(request: NextRequest): boolean {
  return request.headers.get("x-internal-secret") === process.env.INTERNAL_API_SECRET;
}

const bodySchema = z.object({
  gameType: z.string().min(1),
  personaIds: z.array(z.number().int().positive()).min(1),
});

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

  const { gameType, personaIds } = parsed.data;

  try {
    const { token } = await launchGameSession(gameType, personaIds);
    logger.info({ msg: "Game session launched", token, gameType, personaIds });
    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    const message = (error as Error).message;
    logger.warn({ msg: "Game session launch failed", gameType, personaIds, error: message });
    if (
      message.includes("Unknown game type") ||
      message.includes("requires") ||
      message.includes("already running")
    ) {
      const status = message.includes("already running") ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
