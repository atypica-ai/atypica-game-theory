import { withAuth } from "@/lib/request/withAuth";
import { rootLogger } from "@/lib/logging";
import { NextRequest } from "next/server";
import { waitUntil } from "@vercel/functions";

import { 
  validatePodcastRequest, 
  backgroundGeneratePodcastAudio 
} from "@/app/(podcast)/lib";

export async function POST(request: NextRequest) {
  try {
    const { podcastToken } = await request.json();

    if (!podcastToken) {
      return Response.json(
        { success: false, error: "Missing podcastToken" },
        { status: 400 }
      );
    }

    return await withAuth(async (user, userType, team) => {
      try {
        // Validate request and get podcast data
        const { podcast, locale } = await validatePodcastRequest(podcastToken, user.id);

        // Check if already generated
        if (podcast.generatedAt && podcast.podcastUrl) {
          return Response.json({
            success: true,
            message: "Audio already generated",
            podcastUrl: podcast.podcastUrl,
          });
        }

        // Start background audio generation
        waitUntil(
          backgroundGeneratePodcastAudio({
            podcastId: podcast.id,
            podcastToken: podcast.token,
            script: podcast.script,
            locale,
          })
        );

        return Response.json({
          success: true,
          message: "Audio generation started",
          podcastToken: podcast.token,
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage === "Podcast not found") {
          return Response.json(
            { success: false, error: "Podcast not found" },
            { status: 404 }
          );
        } else if (errorMessage === "Unauthorized") {
          return Response.json(
            { success: false, error: "Unauthorized" },
            { status: 403 }
          );
        } else if (errorMessage === "No script available for audio generation") {
          return Response.json(
            { success: false, error: "No script available for audio generation" },
            { status: 400 }
          );
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
    });

  } catch (error) {
    rootLogger.error("Podcast generation API error", {
      error: error instanceof Error ? error.message : String(error),
    });

    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
} 