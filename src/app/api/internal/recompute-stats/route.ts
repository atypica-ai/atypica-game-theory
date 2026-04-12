import { recomputeAllStats } from "@/app/(game-theory)/lib/stats/recompute";
import { rootLogger } from "@/lib/logging";
import { NextRequest, NextResponse } from "next/server";

function validateInternalAuth(request: NextRequest): boolean {
  return request.headers.get("x-internal-secret") === process.env.INTERNAL_API_SECRET;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = rootLogger.child({ api: "recompute-stats" });

  if (!validateInternalAuth(request)) {
    logger.warn({ msg: "Unauthorized access attempt to recompute-stats API" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await recomputeAllStats();

    logger.info({
      msg: "Stats recomputation complete",
      computed: result.computed,
      errors: result.errors.length,
      durationMs: result.durationMs,
    });

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = (error as Error).message;
    logger.error({ msg: "Stats recomputation failed", error: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
