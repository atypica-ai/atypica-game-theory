import { GameSessionExtra, GameTimeline } from "@/app/(game-theory)/types";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

function validateInternalAuth(request: NextRequest): boolean {
  return request.headers.get("x-internal-secret") === process.env.INTERNAL_API_SECRET;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const logger = rootLogger.child({ api: "game-session" });

  if (!validateInternalAuth(request)) {
    logger.warn({ msg: "Unauthorized access attempt to game-session API" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;

  const session = await prisma.gameSession.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      gameType: true,
      personaIds: true,
      status: true,
      timeline: true,
      extra: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const extra = session.extra as GameSessionExtra;
  const timeline = session.timeline as GameTimeline;

  return NextResponse.json({
    id: session.id,
    token: session.token,
    gameType: session.gameType,
    status: session.status,
    participants: extra.participants ?? [],
    error: extra.error ?? null,
    rounds: timeline.filter((e) => e.type === "round-result").length,
    timeline,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
