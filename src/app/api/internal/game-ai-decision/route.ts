import authOptions from "@/app/(auth)/authOptions";
import { getGameType } from "@/app/(game-theory)/gameTypes";
import { buildGamePersonaSession } from "@/app/(game-theory)/lib/generation";
import { appendTimelineEvents, refreshTimeline } from "@/app/(game-theory)/lib/persistence";
import { generateAIDecision } from "@/app/(game-theory)/lib/phases";
import { GameSessionExtra, HUMAN_PLAYER_ID, PersonaDecisionEvent } from "@/app/(game-theory)/types";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });
  }

  const { token, personaId, roundId } = (await request.json()) as {
    token: string;
    personaId: number;
    roundId: number;
  };

  try {
    const row = await prisma.gameSession.findUnique({
      where: { token },
      select: { gameType: true, extra: true },
    });
    if (!row) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    const extra = (row.extra ?? {}) as GameSessionExtra;
    const human = extra.participants?.find((p) => p.personaId === HUMAN_PLAYER_ID);
    if (!human || human.userId !== session.user.id) {
      return NextResponse.json({ success: false, message: "Not a participant" }, { status: 403 });
    }

    const participants = extra.participants ?? [];
    const gameType = getGameType(extra.gameType);
    const persona = await prisma.persona.findUniqueOrThrow({ where: { id: personaId } });
    const modelName = extra.personaModels?.[personaId] ?? "gemini-3-flash";
    const personaSession = buildGamePersonaSession({ persona, modelName });

    const snapshot = await refreshTimeline(token);
    const logger = rootLogger.child({ gameSessionToken: token, personaId });
    const ctx = {
      gameSessionToken: token,
      locale: "en-US" as const,
      abortSignal: new AbortController().signal,
      statReport: async () => {},
      logger,
      discussionRounds: extra.discussionRounds ?? gameType.discussionRounds,
    };

    const result = await generateAIDecision(snapshot, personaSession, gameType, participants, roundId, ctx);

    const event: PersonaDecisionEvent = {
      type: "persona-decision",
      personaId: result.personaSession.personaId,
      personaName: result.personaSession.personaName,
      reasoning: result.reasoning,
      content: result.content,
      round: roundId,
    };

    await appendTimelineEvents(token, [event]);
    return NextResponse.json({ success: true, event });
  } catch (error) {
    return NextResponse.json({ success: false, message: (error as Error).message }, { status: 500 });
  }
}
