"use server";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { ServerActionResult } from "@/lib/serverAction";
import { AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";

export async function fetchPodcastByToken(podcastToken: string): Promise<
  ServerActionResult<{
    podcast: Pick<AnalystPodcast, "id" | "token" | "script" | "objectUrl" | "generatedAt"> & {
      extra: AnalystPodcastExtra;
    };
    coverCdnHttpUrl?: string;
  }>
> {
  const podcast = await prismaRO.analystPodcast.findUnique({
    where: { token: podcastToken },
    select: {
      id: true,
      token: true,
      script: true,
      objectUrl: true,
      generatedAt: true,
      extra: true,
    },
  });

  if (!podcast) {
    return {
      success: false,
      code: "internal_server_error",
      message: "Podcast fetch timeout",
    };
  }

  if (!podcast.generatedAt) {
    return {
      success: false,
      code: "not_found",
      message: "Podcast not found or not yet generated.",
    };
  }

  // Use podcast's own cover image
  const coverObjectUrl = podcast.extra.metadata?.coverObjectUrl;
  const coverCdnHttpUrl = coverObjectUrl ? await getS3SignedCdnUrl(coverObjectUrl) : undefined;

  return {
    success: true,
    data: {
      podcast: {
        id: podcast.id,
        token: podcast.token,
        script: podcast.script,
        objectUrl: podcast.objectUrl,
        generatedAt: podcast.generatedAt,
        extra: podcast.extra,
      },
      coverCdnHttpUrl,
    },
  };
}
