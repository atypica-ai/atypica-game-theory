import { NextRequest, NextResponse } from "next/server";
import { rootLogger } from "@/lib/logging";
import { processHeatPipeline } from "@/app/(pulse)/heat";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/prisma/prisma";

const logger = rootLogger.child({ api: "calculate-heat" });

function validateInternalAuth(request: NextRequest): boolean {
  const internalSecret = request.headers.get("x-internal-secret");
  return internalSecret === process.env.INTERNAL_API_SECRET;
}

/**
 * POST /api/internal/calculate-heat
 * Independent API endpoint for Module 1 (HEAT Pipeline)
 * Processes pulses: gather posts → calculate HEAT → generate description
 *
 * Query parameters:
 * - categoryId (optional): Process specific category only
 * - includeAlreadyScored (optional): Include pulses that already have HEAT scores (default: false)
 * - onlyUnscored (optional): Process all unscored pulses in current data range (default: false)
 *   When true, ignores categoryId and date filters, processes all pulses with heatScore: null
 *
 * Body (optional):
 * - pulseIds: Array of pulse IDs to process (if provided, query params are ignored)
 */
export async function POST(request: NextRequest) {
  if (!validateInternalAuth(request)) {
    logger.warn("Unauthorized access to calculate-heat API");
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Try to parse body for pulseIds
    let pulseIds: number[] | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      if (body.pulseIds && Array.isArray(body.pulseIds)) {
        pulseIds = body.pulseIds.map((id: unknown) => Number(id)).filter((id: number) => !isNaN(id));
      }
    } catch {
      // Body parsing failed, use query params
    }

    // If pulseIds not provided, query pulses based on query params
    if (!pulseIds || pulseIds.length === 0) {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get("category") ?? undefined;
      const includeAlreadyScored = searchParams.get("includeAlreadyScored") === "true";
      const onlyUnscored = searchParams.get("onlyUnscored") === "true";

      // Query pulses based on filters
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const pulses = await prisma.pulse.findMany({
        where: {
          ...(onlyUnscored
            ? {}
            : {
                ...(category ? { category } : {}),
                createdAt: { gte: todayStart },
              }),
          ...(includeAlreadyScored || onlyUnscored ? {} : { heatScore: null }),
          ...(onlyUnscored ? { heatScore: null } : {}),
        },
        select: { id: true },
      });

      pulseIds = pulses.map((p) => p.id);
    }

    logger.info({ msg: "Starting HEAT calculation pipeline", pulseCount: pulseIds.length });

    // Execute in background using waitUntil
    waitUntil(
      processHeatPipeline(pulseIds, logger)
        .then((result) => {
          logger.info({ msg: "HEAT pipeline completed", processed: result.processed, errors: result.errors, pulseCount: pulseIds.length });
        })
        .catch((error) => {
          logger.error({ msg: "HEAT pipeline failed", error: (error as Error).message, pulseCount: pulseIds.length });
        }),
    );

    return NextResponse.json({
      success: true,
      message: "Scheduled HEAT calculation pipeline",
      pulseCount: pulseIds.length,
    });
  } catch (error) {
    logger.error({
      error: (error as Error).message,
      msg: "Failed to start HEAT pipeline",
    });
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}


