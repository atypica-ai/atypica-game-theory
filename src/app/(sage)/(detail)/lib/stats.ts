import "server-only";

import { prisma } from "@/prisma/prisma";
import type { SageStats } from "../types";

/**
 * Fetch complete sage statistics (server-only)
 * Used in server components (layout.tsx) to provide stats to context
 */
export async function fetchSageStats(sageId: number): Promise<SageStats> {
  const [memoryData, gapsCount, interviewsCount, chatsCount, sourcesData] = await Promise.all([
    // Memory version and working memory
    prisma.sageMemoryDocument.findFirst({
      where: { sageId },
      orderBy: { version: "desc" },
      select: { version: true, working: true },
    }),

    // Count unresolved knowledge gaps
    prisma.sageKnowledgeGap.count({
      where: { sageId, resolvedAt: null },
    }),

    // Count all interviews
    prisma.sageInterview.count({
      where: { sageId },
    }),

    // Count all user chats
    prisma.sageChat.count({
      where: { sageId },
    }),

    // Sources statistics (total and extracted)
    (async () => {
      const [total, extracted] = await Promise.all([
        prisma.sageSource.count({ where: { sageId } }),
        prisma.sageSource.count({
          where: { sageId, extractedText: { not: "" } },
        }),
      ]);
      return { total, extracted };
    })(),
  ]);

  const pendingWorkingMemory =
    (memoryData?.working as { status: string }[])?.filter((item) => item.status === "pending") ||
    [];

  return {
    memoryVersion: memoryData?.version || 0,
    gapsCount,
    interviewsCount,
    chatsCount,
    sourcesTotal: sourcesData.total,
    sourcesExtracted: sourcesData.extracted,
    workingMemoryPendingCount: pendingWorkingMemory.length,
  };
}
