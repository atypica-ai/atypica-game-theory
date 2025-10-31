"use server";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, AnalystPodcast, AnalystReportExtra, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";

export async function fetchPodcastByToken(podcastToken: string): Promise<
  ServerActionResult<{
    podcast: Pick<AnalystPodcast, "id" | "token" | "script" | "objectUrl" | "generatedAt">;
    analyst: Pick<Analyst, "id" | "topic">;
    studyUserChat: Pick<UserChat, "token" | "title">;
    report?: {
      id: number;
      token: string;
      generatedAt: Date | null;
      onePageHtml: string;
      extra: AnalystReportExtra;
    };
  }>
> {
  try {
    const podcast = await Promise.race([
      prisma.analystPodcast.findUnique({
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
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

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

    if (!podcast.analyst?.studyUserChat?.token) {
      return {
        success: false,
        code: "not_found",
        message: "Study not found.",
      };
    }

    // Fetch the latest report for this analyst
    const latestReport = await Promise.race([
      prisma.analystReport.findFirst({
        where: {
          analystId: podcast.analyst.id,
          generatedAt: { not: null },
        },
        orderBy: { generatedAt: "desc" },
        select: {
          id: true,
          token: true,
          generatedAt: true,
          onePageHtml: true,
          extra: true,
        },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);

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
        report: latestReport
          ? {
              id: latestReport.id,
              token: latestReport.token,
              generatedAt: latestReport.generatedAt,
              onePageHtml: latestReport.onePageHtml,
              extra: latestReport.extra as AnalystReportExtra,
            }
          : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
