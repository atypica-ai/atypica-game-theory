import { batchGeneratePodcasts } from "@/app/(podcast)/lib/batch";
import { rootLogger } from "@/lib/logging";
import { NextRequest } from "next/server";

// Internal auth validation helper
function validateInternalAuth(request: NextRequest): boolean {
  const internalSecret = request.headers.get("x-internal-secret");
  return internalSecret === process.env.INTERNAL_API_SECRET;
}

export async function POST(request: NextRequest) {
  const logger = rootLogger.child({ api: "batch-generate-podcasts" });

  try {
    // Validate internal authentication
    if (!validateInternalAuth(request)) {
      logger.warn("Unauthorized access to batch podcast generate API");
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Parse optional parameters
    const {
      batchSize = 10,
      targetCount = 10,
      poolLimit = 10,
    } = await request.json().catch(() => ({}));

    // Validate parameters
    if (batchSize < 1 || batchSize > 50) {
      return Response.json(
        { success: false, error: "batchSize must be between 1 and 50" },
        { status: 400 },
      );
    }

    if (targetCount < 1 || targetCount > 100) {
      return Response.json(
        { success: false, error: "targetCount must be between 1 and 100" },
        { status: 400 },
      );
    }

    if (poolLimit < 1 || poolLimit > 100) {
      return Response.json(
        { success: false, error: "poolLimit must be between 1 and 100" },
        { status: 400 },
      );
    }

    logger.info({
      msg: "Batch podcast generation request received",
      batchSize,
      targetCount,
      poolLimit,
    });

    // Start background processing directly using lib function
    const result = await batchGeneratePodcasts({
      batchSize,
      targetCount,
      poolLimit,
    });

    logger.info({
      msg: "Batch podcast generation completed",
      totalProcessed: result.totalProcessed,
      successful: result.successful,
      failed: result.failed,
      processingTimeMs: result.summary.processingTimeMs,
    });

    // Return result after completion
    return Response.json({
      success: true,
      message: "Batch podcast generation completed successfully",
      result: {
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        processingTimeMs: result.summary.processingTimeMs,
      },
      params: {
        batchSize,
        targetCount,
        poolLimit,
      },
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error({
      msg: "Batch podcast generation API error",
      error: errorMessage,
      stack: errorStack,
    });

    return Response.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
