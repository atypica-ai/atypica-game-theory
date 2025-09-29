"use server";
import { podcastObjectUrlToHttpUrl } from "@/app/(podcast)/lib/utils";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, AnalystPodcast, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

export async function fetchPodcastByToken(podcastToken: string): Promise<
  ServerActionResult<{
    podcast: Pick<AnalystPodcast, "id" | "token" | "script" | "objectUrl" | "generatedAt">;
    analyst: Pick<Analyst, "id" | "topic">;
    studyUserChat: Pick<UserChat, "token" | "title">;
  }>
> {
  try {
    const podcast = await prisma.analystPodcast.findUnique({
      where: { token: podcastToken },
      select: {
        id: true,
        token: true,
        script: true,
        objectUrl: true,
        generatedAt: true,
        analyst: {
          select: {
            id: true,
            topic: true,
            studyUserChat: {
              select: { token: true, title: true },
            },
          },
        },
      },
    });

    if (!podcast || !podcast.generatedAt) {
      return {
        success: false,
        code: "not_found",
        message: "Podcast not found or not yet generated.",
      };
    }

    if (!podcast.analyst?.studyUserChat?.token) {
      return {
        success: false,
        code: "not_found",
        message: "Study not found.",
      };
    }

    return {
      success: true,
      data: {
        podcast: {
          id: podcast.id,
          token: podcast.token,
          script: podcast.script,
          objectUrl: podcast.objectUrl,
          generatedAt: podcast.generatedAt,
        },
        analyst: {
          id: podcast.analyst.id,
          topic: podcast.analyst.topic,
        },
        studyUserChat: {
          token: podcast.analyst.studyUserChat.token,
          title: podcast.analyst.studyUserChat.title,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getPodcastAudioUrl(
  podcastToken: string,
): Promise<ServerActionResult<string | null>> {
  try {
    const podcast = await prisma.analystPodcast.findUnique({
      where: { token: podcastToken },
      select: {
        id: true,
        objectUrl: true,
        extra: true,
        generatedAt: true,
      },
    });

    if (!podcast || !podcast.generatedAt || !podcast.objectUrl) {
      return {
        success: false,
        code: "not_found",
        message: "Podcast audio not found.",
      };
    }

    const signedUrl = await podcastObjectUrlToHttpUrl(podcast);
    return {
      success: true,
      data: signedUrl,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
