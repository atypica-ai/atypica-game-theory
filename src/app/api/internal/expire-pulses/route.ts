import { NextRequest, NextResponse } from "next/server";
import { rootLogger } from "@/lib/logging";
import { processExpirationTest } from "@/app/(pulse)/expiration";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";

const logger = rootLogger.child({ api: "expire-pulses" });

function validateInternalAuth(request: NextRequest): boolean {
  const internalSecret = request.headers.get("x-internal-secret");
  return internalSecret === process.env.INTERNAL_API_SECRET;
}

/**
 * POST /api/internal/expire-pulses
 * Independent API endpoint for Module 2 (Expiration Test)
 * Processes pulses: calculate HEAT delta → apply expiration test → mark expired pulses
 *
 * Query parameters:
 * - categoryId (optional): Process specific category only
 *
 * Body (optional):
 * - pulseIds: Array of pulse IDs to process (if provided, query params are ignored)
 */
export async function POST(request: NextRequest) {
  if (!validateInternalAuth(request)) {
    logger.warn("Unauthorized access to expire-pulses API");
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
      const categoryIdParam = searchParams.get("categoryId");
      const categoryId = categoryIdParam ? parseInt(categoryIdParam, 10) : undefined;

      if (categoryIdParam && isNaN(categoryId!)) {
        return NextResponse.json(
          { success: false, error: "Invalid categoryId parameter" },
          { status: 400 },
        );
      }

      logger.info({ msg: "Starting expiration test", categoryId });

      // Query pulse IDs by category (if provided)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const pulses = await prisma.pulse.findMany({
        where: {
          ...(categoryId ? { categoryId } : {}),
          createdAt: { gte: todayStart },
          heatScore: { not: null },
          // Include pulses with null heatDelta (new pulses) - they will be kept by expiration logic
        },
        select: { id: true },
      });

      pulseIds = pulses.map((p) => p.id);
    } else {
      logger.info({ msg: "Starting expiration test for provided pulse IDs", pulseCount: pulseIds.length });
    }

    // Execute in background using waitUntil
    waitUntil(
      processExpirationTest(pulseIds, logger)
        .then((result) => {
          logger.info({ msg: "Expiration test completed", expired: result.expired, kept: result.kept, pulseCount: pulseIds.length });
        })
        .catch((error) => {
          logger.error({ msg: "Expiration test failed", error: (error as Error).message, pulseCount: pulseIds.length });
        }),
    );

    return NextResponse.json({
      success: true,
      message: "Scheduled expiration test",
      pulseCount: pulseIds.length,
    });
  } catch (error) {
    logger.error({
      error: (error as Error).message,
      msg: "Failed to start expiration test",
    });
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}


