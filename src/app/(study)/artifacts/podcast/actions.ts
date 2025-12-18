"use server";
import { getS3SignedCdnUrl } from "@/lib/attachments/actions";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, AnalystPodcast, AnalystPodcastExtra, UserChat } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";

export async function fetchPodcastByToken(podcastToken: string): Promise<
  ServerActionResult<{
    podcast: Pick<AnalystPodcast, "id" | "token" | "script" | "objectUrl" | "generatedAt"> & {
      extra: AnalystPodcastExtra;
    };
    analyst: Pick<Analyst, "id" | "topic">;
    studyUserChat: Pick<UserChat, "token" | "title">;
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
      analystId: true,
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

  const analyst = await prismaRO.analyst.findUnique({
    where: {
      id: podcast.analystId,
    },
    select: {
      id: true,
      topic: true,
      studyUserChat: {
        select: { token: true, title: true },
      },
    },
  });

  if (!analyst?.studyUserChat?.token) {
    return {
      success: false,
      code: "not_found",
      message: "Study not found.",
    };
  }

  // Use podcast's own cover image
  const coverObjectUrl = (podcast.extra as AnalystPodcastExtra).metadata?.coverObjectUrl;
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
        extra: podcast.extra as AnalystPodcastExtra,
      },
      analyst: {
        id: analyst.id,
        topic: analyst.topic,
      },
      studyUserChat: {
        token: analyst.studyUserChat.token,
        title: analyst.studyUserChat.title,
      },
      coverCdnHttpUrl,
    },
  };
}
