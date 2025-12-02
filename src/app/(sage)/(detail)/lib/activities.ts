import "server-only";

import type { SageActivity } from "../types";
import type { SageInterviewExtra, SageKnowledgeGapExtra } from "@/app/(sage)/types";
import { prisma } from "@/prisma/prisma";

/**
 * Fetch recent activity timeline from existing database records (server-only)
 * Queries multiple tables and combines into unified activity feed
 */
export async function fetchSageActivities({
  sageId,
  sageToken,
  limit = 20,
  locale,
}: {
  sageId: number;
  sageToken: string;
  limit?: number;
  locale: string;
}): Promise<SageActivity[]> {
  // Parallel queries for performance
  const [recentSources, recentGapsResolved, recentGapsCreated, recentMemories, recentInterviews] =
    await Promise.all([
      // Recent sources added/processed
      prisma.sageSource.findMany({
        where: { sageId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          createdAt: true,
          extractedText: true,
        },
      }),

      // Recently resolved gaps
      prisma.sageKnowledgeGap.findMany({
        where: { sageId, resolvedAt: { not: null } },
        orderBy: { resolvedAt: "desc" },
        take: 5,
        select: {
          id: true,
          area: true,
          resolvedAt: true,
          extra: true,
        },
      }),

      // Recently discovered gaps (for batch analysis events)
      prisma.sageKnowledgeGap.findMany({
        where: { sageId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          area: true,
          createdAt: true,
          severity: true,
        },
      }),

      // Recent memory document versions
      prisma.sageMemoryDocument.findMany({
        where: { sageId },
        orderBy: { version: "desc" },
        take: 3,
        select: {
          version: true,
          changeNotes: true,
          createdAt: true,
        },
      }),

      // Recently completed interviews
      prisma.sageInterview.findMany({
        where: { sageId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          userChat: {
            select: {
              token: true,
              updatedAt: true,
            },
          },
        },
      }),
    ]);

  const activities: SageActivity[] = [];
  const isZh = locale === "zh-CN";

  // Transform sources into activities
  recentSources.forEach((source) => {
    const hasExtracted = !!source.extractedText && source.extractedText.length > 0;
    activities.push({
      id: `source-${source.id}`,
      type: hasExtracted ? "success" : "info",
      title: isZh
        ? hasExtracted
          ? "知识源已处理"
          : "新知识源已添加"
        : hasExtracted
          ? "Source Processed"
          : "New Source Added",
      description: isZh
        ? `文档「${source.title}」已${hasExtracted ? "处理完成" : "添加"}`
        : `Document "${source.title}" ${hasExtracted ? "processed" : "added"}`,
      timestamp: source.createdAt,
      icon: hasExtracted ? "CheckCircle2" : "FileText",
    });
  });

  // Transform resolved gaps into activities
  recentGapsResolved.forEach((gap) => {
    const extra = gap.extra as SageKnowledgeGapExtra;
    activities.push({
      id: `gap-resolved-${gap.id}`,
      type: "success",
      title: isZh ? "知识空白已填补" : "Knowledge Gap Resolved",
      description: isZh ? `已补充「${gap.area}」相关知识` : `Filled knowledge in "${gap.area}"`,
      timestamp: gap.resolvedAt!,
      icon: "Sparkles",
      link: extra.resolvedChat
        ? {
            href: `/sage/interview/${extra.resolvedChat.token}`,
            label: isZh ? "查看访谈" : "View Interview",
          }
        : undefined,
    });
  });

  // Group gaps discovered in same batch (within 1 minute)
  if (recentGapsCreated.length > 0) {
    const latestGapCreatedAt = recentGapsCreated[0].createdAt;
    const gapsInSameBatch = recentGapsCreated.filter(
      (g) => Math.abs(g.createdAt.getTime() - latestGapCreatedAt.getTime()) < 60000,
    );

    if (gapsInSameBatch.length > 0) {
      activities.push({
        id: `gaps-discovered-${latestGapCreatedAt.getTime()}`,
        type: "warning",
        title: isZh ? "发现知识空白" : "Knowledge Gaps Discovered",
        description: isZh
          ? `发现 ${gapsInSameBatch.length} 处待补充知识`
          : `Found ${gapsInSameBatch.length} knowledge gaps to fill`,
        timestamp: latestGapCreatedAt,
        icon: "AlertTriangle",
        link: {
          href: `/sage/${sageToken}/gaps`,
          label: isZh ? "查看空白" : "View Gaps",
        },
      });
    }
  }

  // Transform memory versions into activities
  recentMemories.forEach((memory) => {
    activities.push({
      id: `memory-${memory.version}`,
      type: "success",
      title: isZh ? "知识提取完成" : "Knowledge Extraction Completed",
      description: isZh
        ? `版本 ${memory.version}: ${memory.changeNotes}`
        : `Version ${memory.version}: ${memory.changeNotes}`,
      timestamp: memory.createdAt,
      icon: "Database",
      link: {
        href: `/sage/${sageToken}/memory`,
        label: isZh ? "查看记忆" : "View Memory",
      },
    });
  });

  // Transform completed interviews into activities
  recentInterviews.forEach((interview) => {
    const extra = interview.extra as SageInterviewExtra;
    if (!extra.ongoing) {
      activities.push({
        id: `interview-${interview.id}`,
        type: "info",
        title: isZh ? "访谈已完成" : "Interview Completed",
        description: isZh ? "通过访谈获得了新知识" : "New knowledge acquired through interview",
        timestamp: interview.userChat.updatedAt,
        icon: "Mic",
        link: {
          href: `/sage/interview/${interview.userChat.token}`,
          label: isZh ? "查看访谈" : "View Interview",
        },
      });
    }
  });

  // Sort by timestamp DESC and limit
  return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}
