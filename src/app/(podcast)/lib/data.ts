import "server-only";

import { generateToken } from "@/lib/utils";
import type { Analyst, AnalystPodcast, AnalystPodcastExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import type { PodcastCreationParams } from "./types";

// Pure data fetching function (no auth)
export async function fetchPodcastsForAnalyst(
  analystId: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: number,
): Promise<
  (Pick<
    AnalystPodcast,
    | "id"
    | "token"
    | "analystId"
    | "script"
    | "objectUrl"
    | "generatedAt"
    | "createdAt"
    | "updatedAt"
  > & {
    analyst: Analyst;
    extra: AnalystPodcastExtra;
  })[]
> {
  // Verify ownership
  const analyst = await prisma.analyst.findUnique({
    where: { id: analystId },
  });
  if (!analyst) {
    throw new Error("Analyst not found");
  }

  const podcasts = await prisma.analystPodcast.findMany({
    where: {
      analystId: analyst.id,
    },
    select: {
      id: true,
      token: true,
      analystId: true,
      analyst: true,
      script: true,
      objectUrl: true,
      generatedAt: true,
      createdAt: true,
      updatedAt: true,
      extra: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return podcasts;
}

// Core podcast record creation
export async function createPodcastRecord(params: PodcastCreationParams): Promise<AnalystPodcast> {
  const { analystId, instruction, token = generateToken() } = params;

  return await prisma.analystPodcast.create({
    data: {
      analystId,
      instruction,
      token,
      script: "",
    },
  });
}

// Get analyst pool - analysts with reports, ordered by most recent updates
export async function getAnalystPool(
  limit: number = 10,
): Promise<Array<{ id: number; topic: string }>> {
  const analysts = await prisma.analyst.findMany({
    where: {
      reports: {
        some: {}, // Has at least one AnalystReport
      },
    },
    select: {
      id: true,
      topic: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return analysts;
}
