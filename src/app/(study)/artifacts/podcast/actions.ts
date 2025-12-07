"use server";
import { proxiedImageCdnUrl } from "@/app/(system)/cdn/lib";
import { ServerActionResult } from "@/lib/serverAction";
import {
  Analyst,
  AnalystPodcast,
  AnalystPodcastExtra,
  AnalystReportExtra,
  UserChat,
} from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

export async function fetchPodcastByToken(podcastToken: string): Promise<
  ServerActionResult<{
    podcast: Pick<AnalystPodcast, "id" | "token" | "script" | "objectUrl" | "generatedAt"> & {
      extra: AnalystPodcastExtra;
    };
    analyst: Pick<Analyst, "id" | "topic">;
    studyUserChat: Pick<UserChat, "token" | "title">;
    report?: {
      id: number;
      token: string;
      generatedAt: Date | null;
      extra: AnalystReportExtra;
    };
    coverCdnHttpUrl?: string;
  }>
> {
  const podcast = await prisma.analystPodcast.findUnique({
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

  // Fetch the latest report for this analyst
  const [latestReport, analyst] = await Promise.all([
    Promise.race([
      prisma.analystReport.findFirst({
        where: {
          analystId: podcast.analystId,
          generatedAt: { not: null },
        },
        orderBy: { generatedAt: "desc" },
        select: {
          id: true,
          token: true,
          generatedAt: true,
          extra: true,
        },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]),
    prisma.analyst.findUnique({
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
    }),
  ]);

  if (!analyst?.studyUserChat?.token) {
    return {
      success: false,
      code: "not_found",
      message: "Study not found.",
    };
  }

  const coverObjectUrl = latestReport
    ? (latestReport.extra as AnalystReportExtra).coverObjectUrl
    : undefined;
  const coverCdnHttpUrl = coverObjectUrl
    ? proxiedImageCdnUrl({ objectUrl: coverObjectUrl })
    : undefined;

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
      report: latestReport
        ? {
            id: latestReport.id,
            token: latestReport.token,
            generatedAt: latestReport.generatedAt,
            extra: latestReport.extra as AnalystReportExtra,
          }
        : undefined,
      coverCdnHttpUrl,
    },
  };
}
