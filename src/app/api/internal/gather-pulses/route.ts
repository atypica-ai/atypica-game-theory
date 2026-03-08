import { NextRequest, NextResponse } from "next/server";
import { rootLogger } from "@/lib/logging";
import { runDailyPulsePipeline } from "@/app/(pulse)/lib/runDailyPipeline";
import { waitUntil } from "@vercel/functions";

const logger = rootLogger.child({ api: "gather-pulses" });

function validateInternalAuth(request: NextRequest): boolean {
  const internalSecret = request.headers.get("x-internal-secret");
  return internalSecret === process.env.INTERNAL_API_SECRET;
}

/**
 * POST /api/internal/gather-pulses
 *
 * Cronjob entry point: gather → HEAT → expiration (full daily pipeline)
 */
export async function POST(request: NextRequest) {
  if (!validateInternalAuth(request)) {
    logger.warn("Unauthorized access to gather-pulses API");
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  logger.info("Scheduling daily pulse pipeline");

  waitUntil(
    runDailyPulsePipeline(logger).catch((error) => {
      logger.error({ msg: "Daily pulse pipeline failed", error: (error as Error).message });
    }),
  );

  return NextResponse.json({
    success: true,
    message: "Daily pulse pipeline scheduled",
  });
}
