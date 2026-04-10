import { cleanupStaleSessions } from "@/app/(game-theory)/lib/runtime";
import { rootLogger } from "@/lib/logging";
import { NextRequest, NextResponse } from "next/server";

function validateInternalAuth(request: NextRequest): boolean {
  return request.headers.get("x-internal-secret") === process.env.INTERNAL_API_SECRET;
}

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = rootLogger.child({ api: "cleanup-stale-sessions" });

  if (!validateInternalAuth(request)) {
    logger.warn({ msg: "Unauthorized access attempt to cleanup-stale-sessions API" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cleaned, tokens } = await cleanupStaleSessions(STALE_THRESHOLD_MS);

  logger.info({ msg: "Stale session cleanup complete", cleaned, tokens });

  return NextResponse.json({ success: true, cleaned, tokens, timestamp: new Date().toISOString() });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
