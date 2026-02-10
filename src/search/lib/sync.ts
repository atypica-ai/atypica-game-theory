import "server-only";

import { rootLogger } from "@/lib/logging";
import {
  AnalystPodcast,
  AnalystPodcastExtra,
  AnalystReport,
  AnalystReportExtra,
  FeaturedItemResourceType,
  Persona,
} from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { ArtifactDocument, ArtifactType, PersonaDocument } from "../types";
import { INDEXES, meilisearchClient } from "./client";

const logger = rootLogger.child({ module: "search-sync" });

/**
 * 将 Report 转换为 Artifact 文档
 * 只包含搜索必需的字段
 */
export function reportToDocument({
  report,
  isFeatured,
}: {
  report: AnalystReport;
  isFeatured: boolean;
}): ArtifactDocument {
  const extra = report.extra as AnalystReportExtra;

  return {
    slug: `report-${report.id}`,
    type: "report",

    title: extra?.title || "",
    description: extra?.description || "",

    kind: extra?.analystKind || null,
    isFeatured,
    userId: report.userId,
    teamId: null,

    createdAt: report.createdAt.getTime(),
  };
}

/**
 * 将 Podcast 转换为 Artifact 文档
 * 只包含搜索必需的字段
 */
export function podcastToDocument({
  podcast,
  isFeatured,
}: {
  podcast: AnalystPodcast;
  isFeatured: boolean;
}): ArtifactDocument {
  const extra = podcast.extra as AnalystPodcastExtra;
  const metadata = extra?.metadata;

  return {
    slug: `podcast-${podcast.id}`,
    type: "podcast",

    title: metadata?.title || "",
    description: metadata?.showNotes || "",

    kind: null,
    isFeatured,
    userId: podcast.userId,
    teamId: null,

    createdAt: podcast.createdAt.getTime(),
  };
}

/**
 * 同步单个 Report 到 Meilisearch
 */
export async function syncReport(reportId: number): Promise<void> {
  try {
    logger.info({ msg: "Starting report sync", reportId });

    const report = await prismaRO.analystReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      logger.warn({ msg: "Report not found for sync", reportId });
      return;
    }

    logger.info({ msg: "Report fetched from database", reportId, createdAt: report.createdAt });

    // 查询是否 featured
    const featuredItem = await prismaRO.featuredItem.findFirst({
      where: {
        resourceType: FeaturedItemResourceType.AnalystReport,
        resourceId: reportId,
      },
    });
    const isFeatured = !!featuredItem;

    const document = reportToDocument({ report, isFeatured });
    logger.info({ msg: "Report converted to document", reportId, document });

    const index = meilisearchClient.index(INDEXES.ARTIFACTS);
    const task = index.addDocuments([document]);

    logger.info({ msg: "Document added to Meilisearch, waiting for task", reportId });
    const result = await task.waitTask();
    logger.info({ msg: "Report sync task completed", reportId, taskResult: result });
  } catch (error) {
    logger.error({
      msg: "Failed to sync report",
      reportId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * 同步单个 Podcast 到 Meilisearch
 */
export async function syncPodcast(podcastId: number): Promise<void> {
  try {
    logger.info({ msg: "Starting podcast sync", podcastId });

    const podcast = await prismaRO.analystPodcast.findUnique({
      where: { id: podcastId },
    });

    if (!podcast) {
      logger.warn({ msg: "Podcast not found for sync", podcastId });
      return;
    }

    logger.info({ msg: "Podcast fetched from database", podcastId, createdAt: podcast.createdAt });

    // 查询是否 featured
    const featuredItem = await prismaRO.featuredItem.findFirst({
      where: {
        resourceType: FeaturedItemResourceType.AnalystPodcast,
        resourceId: podcastId,
      },
    });
    const isFeatured = !!featuredItem;

    const document = podcastToDocument({ podcast, isFeatured });
    logger.info({ msg: "Podcast converted to document", podcastId, document });

    const index = meilisearchClient.index(INDEXES.ARTIFACTS);
    const task = index.addDocuments([document]);

    logger.info({ msg: "Document added to Meilisearch, waiting for task", podcastId });
    const result = await task.waitTask();
    logger.info({ msg: "Podcast sync task completed", podcastId, taskResult: result });
  } catch (error) {
    logger.error({
      msg: "Failed to sync podcast",
      podcastId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * 从 Meilisearch 删除 Artifact
 */
export async function deleteArtifact({
  type,
  id,
}: {
  type: ArtifactType;
  id: number;
}): Promise<void> {
  try {
    const slug = `${type}-${id}`;
    const index = meilisearchClient.index(INDEXES.ARTIFACTS);

    await index.deleteDocument(slug);
    logger.info({ msg: "Artifact deleted from search", type, id, slug });
  } catch (error) {
    logger.error({
      msg: "Failed to delete artifact",
      type,
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 将 Persona 转换为搜索文档
 * 只包含搜索必需的字段
 */
export function personaToDocument({
  persona,
  userId,
  teamId = null,
}: {
  persona: Persona;
  userId: number | null;
  teamId?: number | null;
}): PersonaDocument {
  return {
    slug: `persona-${persona.id}`,

    name: persona.name,
    tags: persona.tags as string[],
    prompt: persona.prompt,

    tier: persona.tier,
    locale: persona.locale || "",
    userId: userId,
    teamId: teamId,

    createdAt: persona.createdAt.getTime(),
  };
}

/**
 * 同步单个 Persona 到 Meilisearch
 */
export async function syncPersona(personaId: number): Promise<void> {
  try {
    logger.info({ msg: "Starting persona sync", personaId });

    const persona = await prismaRO.persona.findUnique({
      where: { id: personaId },
      include: {
        personaImport: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!persona) {
      logger.warn({ msg: "Persona not found for sync", personaId });
      return;
    }

    logger.info({ msg: "Persona fetched from database", personaId, createdAt: persona.createdAt });

    const userId = persona.personaImport?.userId ?? null;
    const document = personaToDocument({ persona, userId, teamId: null });
    logger.info({ msg: "Persona converted to document", personaId, document });

    const index = meilisearchClient.index(INDEXES.PERSONAS);
    const task = index.addDocuments([document]);

    logger.info({ msg: "Document added to Meilisearch, waiting for task", personaId });
    const result = await task.waitTask();
    logger.info({ msg: "Persona sync task completed", personaId, taskResult: result });
  } catch (error) {
    logger.error({
      msg: "Failed to sync persona",
      personaId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * 从 Meilisearch 删除 Persona
 */
export async function deletePersona(id: number): Promise<void> {
  try {
    const slug = `persona-${id}`;
    const index = meilisearchClient.index(INDEXES.PERSONAS);

    await index.deleteDocument(slug);
    logger.info({ msg: "Persona deleted from search", id, slug });
  } catch (error) {
    logger.error({
      msg: "Failed to delete persona",
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
