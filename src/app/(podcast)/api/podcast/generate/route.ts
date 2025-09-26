import { rootLogger } from "@/lib/logging";
import { NextRequest } from "next/server";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@/prisma/prisma";
import { generateToken } from "@/lib/utils";
import { detectInputLanguage } from "@/lib/textUtils";

import { 
  generatePodcastAudio,
  createPodcastRecord,
  generatePodcastScript
} from "@/app/(podcast)/lib";

// Internal auth validation helper
function validateInternalAuth(request: NextRequest): boolean {
  const internalSecret = request.headers.get("x-internal-secret");
  return internalSecret === process.env.INTERNAL_API_SECRET;
}

export async function POST(request: NextRequest) {
  const logger = rootLogger.child({ api: "podcast-generate" });
  
  try {
    // Validate internal authentication
    if (!validateInternalAuth(request)) {
      logger.warn("Unauthorized access to podcast generate API");
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { analystId, instruction = "" } = await request.json();

    if (!analystId || typeof analystId !== 'number') {
      return Response.json(
        { success: false, error: "Missing or invalid analystId" },
        { status: 400 }
      );
    }

    logger.info("Podcast generation request received", { analystId, instruction });

    // Validate that analyst exists and get full details
    const analyst = await prisma.analyst.findUnique({
      where: { id: analystId },
      include: {
        interviews: {
          select: {
            conclusion: true,
          },
        },
      },
    });

    if (!analyst) {
      return Response.json(
        { success: false, error: "Analyst not found" },
        { status: 404 }
      );
    }

    // Detect locale
    const locale = analyst.locale === "zh-CN" || analyst.locale === "en-US" 
      ? analyst.locale 
      : await detectInputLanguage({ text: analyst.brief });

    // Pre-create the podcast record
    const podcastToken = generateToken();
    const podcast = await createPodcastRecord({
      analystId,
      instruction,
      token: podcastToken,
    });

    logger.info("Podcast record created", { 
      analystId, 
      podcastId: podcast.id, 
      podcastToken 
    });

    // Start the complete podcast generation pipeline in background
    waitUntil(
      (async () => {
        const pipelineLogger = logger.child({ 
          podcastId: podcast.id, 
          podcastToken,
          pipeline: "background" 
        });

        try {
          pipelineLogger.info("Starting podcast script generation");
          
          // Step 1: Generate script content using the unified function
          const abortController = new AbortController();
          const statReport = async (dimension: string, value: number, extra?: any) => {
            pipelineLogger.info(`statReport: ${dimension}=${value}`, extra);
          };

          await generatePodcastScript({
            analyst,
            podcast,
            instruction,
            locale,
            abortSignal: abortController.signal,
            statReport,
            logger: pipelineLogger,
          });

          pipelineLogger.info("Script generation completed, fetching updated podcast");

          // Step 2: Fetch the updated podcast with script
          const updatedPodcast = await prisma.analystPodcast.findUnique({
            where: { id: podcast.id },
          });

          if (!updatedPodcast || !updatedPodcast.script?.trim()) {
            throw new Error("Script generation failed - no script content found");
          }

          pipelineLogger.info("Script found, starting audio generation", {
            scriptLength: updatedPodcast.script.length
          });

          // Step 3: Generate audio for the script
          await generatePodcastAudio({
            podcastId: podcast.id,
            podcastToken,
            script: updatedPodcast.script,
            locale,
          });

          pipelineLogger.info("Complete podcast generation pipeline finished successfully");

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          
          pipelineLogger.error("Podcast generation pipeline failed", {
            error: errorMessage,
            stack: errorStack,
            analystId,
            podcastId: podcast.id,
            podcastToken,
          });

          // Update podcast record with error information
          try {
            await prisma.analystPodcast.update({
              where: { id: podcast.id },
              data: {
                extra: {
                  error: errorMessage,
                  failedAt: new Date().toISOString(),
                  stack: errorStack,
                }
              },
            });
          } catch (dbError) {
            pipelineLogger.error("Failed to update podcast record with error", { 
              dbError: dbError instanceof Error ? dbError.message : String(dbError) 
            });
          }

          // Re-throw to ensure the error is properly logged
          throw error;
        }
      })()
    );

    // Return immediately after initiating the jobs
    return Response.json({
      success: true,
      message: "Podcast generation pipeline started",
      analystId,
      podcastId: podcast.id,
      podcastToken,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error("Podcast generation API error", {
      error: errorMessage,
      stack: errorStack,
    });

    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
} 