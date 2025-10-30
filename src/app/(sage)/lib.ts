import "server-only";

import { rootLogger } from "@/lib/logging";
import type { Sage, User } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import type {
  SageAvatar,
  SageExtra,
  SageKnowledgeGapResolvedBy,
  SageKnowledgeGapSeverity,
  SageKnowledgeGapSource,
  SageMemoryDocumentExtra,
} from "./types";

/**
 * Get sage by token with type-safe extra field casting
 * Returns sage object and memoryDocument separately
 */
export async function getSageByToken(token: string): Promise<{
  sage: Omit<Sage, "expertise" | "extra" | "avatar"> & {
    extra: SageExtra;
    expertise: string[];
    avatar: SageAvatar;
    user: Pick<User, "id" | "name" | "email">;
  };
  memoryDocument: string | null;
} | null> {
  const sage = await prisma.sage.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      memoryDocuments: {
        orderBy: { version: "desc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  if (!sage) return null;

  const { memoryDocuments, ...sageData } = sage;

  return {
    sage: {
      ...sageData,
      expertise: sageData.expertise as string[],
      extra: sageData.extra as SageExtra,
      avatar: sageData.avatar as SageAvatar,
    },
    memoryDocument: memoryDocuments[0]?.content ?? null,
  };
}

/**
 * Get sage by ID with type-safe extra field casting
 * Returns sage object and memoryDocument separately
 *
 * FIXIT: 没必要搞这么个方法
 */
export async function getSageById(id: number): Promise<{
  sage: Omit<Sage, "expertise" | "extra" | "avatar"> & {
    extra: SageExtra;
    expertise: string[];
    avatar: SageAvatar;
    user: Pick<User, "id" | "name" | "email">;
  };
  memoryDocument: string | null;
} | null> {
  const sage = await prisma.sage.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      memoryDocuments: {
        orderBy: { version: "desc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  if (!sage) return null;

  const { memoryDocuments, ...sageData } = sage;

  return {
    sage: {
      ...sageData,
      expertise: sageData.expertise as string[],
      extra: sageData.extra as SageExtra,
      avatar: sageData.avatar as SageAvatar,
    },
    memoryDocument: memoryDocuments[0]?.content ?? null,
  };
}

/**
 * Create sage knowledge gaps in database
 */
export async function createSageKnowledgeGaps(
  gaps: {
    sageId: number;
    area: string;
    description: string;
    severity: SageKnowledgeGapSeverity;
    impact: string;
    source: SageKnowledgeGapSource;
  }[],
) {
  if (gaps.length === 0) return [];

  const created = await prisma.sageKnowledgeGap.createMany({
    data: gaps,
  });

  rootLogger.info({
    msg: "Created sage knowledge gaps",
    count: created.count,
  });

  return created;
}

/**
 * Get pending sage knowledge gaps
 */
export async function getPendingSageKnowledgeGaps(sageId: number) {
  return (
    await prisma.sageKnowledgeGap.findMany({
      where: {
        sageId,
        resolvedAt: {
          equals: null,
        },
      },
      orderBy: [
        { severity: "desc" }, // critical first
        { createdAt: "asc" },
      ],
    })
  ).map(({ severity, ...gap }) => ({
    ...gap,
    severity: severity as SageKnowledgeGapSeverity,
  }));
}

/**
 * Resolve sage knowledge gaps
 */
export async function resolveSageKnowledgeGaps(
  gapIds: number[],
  resolvedBy: SageKnowledgeGapResolvedBy,
) {
  if (gapIds.length === 0) return;

  await prisma.sageKnowledgeGap.updateMany({
    where: {
      id: { in: gapIds },
    },
    data: {
      resolvedAt: new Date(),
      resolvedBy,
    },
  });

  rootLogger.info({
    msg: "Resolved sage knowledge gaps",
    gapIds,
    resolvedBy,
  });
}

/**
 * Create a new sage memory document version with optimistic locking
 */
export async function createSageMemoryDocument({
  sageId,
  content,
  source,
  changeNotes,
  lastVersion,
}: {
  sageId: number;
  content: string;
  source: SageMemoryDocumentExtra["source"];
  changeNotes: string;
  lastVersion: number;
}) {
  // Create new version
  const newVersion = lastVersion + 1;

  const version = await prisma.sageMemoryDocument.create({
    data: {
      sageId,
      version: newVersion,
      content,
      changeNotes,
      extra: {
        source,
      } satisfies SageMemoryDocumentExtra,
    },
  });

  // Clean up old versions (keep only latest 20)
  const allVersions = await prisma.sageMemoryDocument.findMany({
    where: { sageId },
    orderBy: { version: "desc" },
    select: { id: true },
    skip: 20, // Skip the latest 20
  });

  if (allVersions.length > 0) {
    await prisma.sageMemoryDocument.deleteMany({
      where: {
        id: { in: allVersions.map((v) => v.id) },
      },
    });

    rootLogger.info({
      msg: "Cleaned up old memory document versions",
      sageId,
      deletedCount: allVersions.length,
    });
  }

  rootLogger.info({
    msg: "Created sage memory document version",
    sageId,
    version: newVersion,
    source,
  });

  return version;
}
