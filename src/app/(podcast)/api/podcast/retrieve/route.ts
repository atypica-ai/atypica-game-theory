import { rootLogger } from "@/lib/logging";
import { NextRequest } from "next/server";
import { prisma } from "@/prisma/prisma";

// Internal auth validation helper
function validateInternalAuth(request: NextRequest): boolean {
  const internalSecret = request.headers.get("x-internal-secret");
  return internalSecret === process.env.INTERNAL_API_SECRET;
}

export async function GET(request: NextRequest) {
  const logger = rootLogger.child({ api: "podcast-retrieve" });
  
  try {
    // Validate internal authentication
    if (!validateInternalAuth(request)) {
      logger.warn("Unauthorized access to podcast retrieve API");
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const analystIdStr = searchParams.get("analystId");
    
    if (!analystIdStr) {
      return Response.json(
        { success: false, error: "Missing analystId parameter" },
        { status: 400 }
      );
    }

    const analystId = parseInt(analystIdStr);
    if (isNaN(analystId)) {
      return Response.json(
        { success: false, error: "Invalid analystId parameter" },
        { status: 400 }
      );
    }

    logger.info("Podcast retrieve request received", { analystId });

    // Validate that analyst exists
    const analyst = await prisma.analyst.findUnique({
      where: { id: analystId },
    });

    if (!analyst) {
      return Response.json(
        { success: false, error: "Analyst not found" },
        { status: 404 }
      );
    }

    // Fetch latest 10 podcasts for the analyst
    const podcasts = await prisma.analystPodcast.findMany({
      where: { analystId },
      select: {
        id: true,
        token: true,
        analystId: true,
        instruction: true,
        script: true,
        podcastUrl: true,
        generatedAt: true,
        extra: true,
        createdAt: true,
        updatedAt: true,
        analyst: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    logger.info("Podcast retrieve completed", { 
      analystId, 
      podcastCount: podcasts.length 
    });

    return Response.json({
      success: true,
      analystId,
      podcasts,
      total: podcasts.length,
    });

  } catch (error) {
    logger.error("Podcast retrieve API error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
} 