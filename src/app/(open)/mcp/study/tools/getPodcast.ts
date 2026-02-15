import "server-only";

import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { prismaRO } from "@/prisma/prisma";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const getPodcastInputSchema = z.object({
  token: z.string().describe("Podcast token"),
});

export async function handleGetPodcast(
  args: z.infer<typeof getPodcastInputSchema>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<CallToolResult> {
  try {
    const context = getMcpRequestContext();
    if (!context?.userId) {
      throw new Error("Missing userId in request context");
    }

    const { token } = args;
    const userId = context.userId;

    // Fetch podcast from database
    const podcast = await prismaRO.analystPodcast.findUnique({
      where: { token },
      select: {
        id: true,
        token: true,
        userId: true,
        instruction: true,
        script: true,
        objectUrl: true,
        extra: true,
        generatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!podcast) {
      throw new Error("Podcast not found");
    }

    if (podcast.userId !== userId) {
      throw new Error("Unauthorized: Podcast does not belong to user");
    }

    if (!podcast.generatedAt) {
      throw new Error("Podcast not yet generated");
    }

    // Get metadata from extra field (similar to fetchPodcastByToken)
    const metadata = podcast.extra.metadata;

    // Get signed CDN URLs for audio and cover
    const audioUrl = podcast.objectUrl ? await getS3SignedCdnUrl(podcast.objectUrl) : null;
    const coverUrl = metadata?.coverObjectUrl
      ? await getS3SignedCdnUrl(metadata.coverObjectUrl)
      : undefined;

    return {
      content: [
        {
          type: "text",
          text: `Podcast retrieved. Token: ${podcast.token}\nTitle: ${metadata?.title || "N/A"}\nDuration: ${metadata?.duration ? `${metadata.duration}s` : "N/A"}`,
        },
      ],
      structuredContent: {
        token: podcast.token,
        instruction: podcast.instruction,
        script: podcast.script,
        audioUrl,
        coverUrl,
        metadata,
        shareUrl: `https://atypica.ai/artifacts/podcast/${podcast.token}/share`,
        generatedAt: podcast.generatedAt?.toISOString(),
        createdAt: podcast.createdAt.toISOString(),
        updatedAt: podcast.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: "Failed to get podcast", error: errorMessage });
    return {
      content: [{ type: "text", text: `Error getting podcast: ${errorMessage}` }],
      isError: true,
    };
  }
}
