import "server-only";

import { rootLogger } from "@/lib/logging";
import {
  AnalystPodcast,
  AnalystPodcastExtra,
  AnalystReport,
  AnalystReportExtra,
  Prisma,
} from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { ArtifactDocument, ArtifactType } from "../types";
import { INDEXES, meilisearchClient } from "./client";

const logger = rootLogger.child({ module: "search-sync" });

/**
 * 将 Report 转换为 Artifact 文档
 * 只包含搜索必需的字段
 */
function reportToDocument(report: AnalystReport): ArtifactDocument {
  const extra = report.extra as AnalystReportExtra;

  return {
    slug: `report-${report.id}`,
    type: "report",

    title: extra?.title || "",
    description: extra?.description || "",

    kind: extra?.analystKind || null,

    createdAt: report.createdAt.getTime(),
  };
}

/**
 * 将 Podcast 转换为 Artifact 文档
 * 只包含搜索必需的字段
 */
function podcastToDocument(podcast: AnalystPodcast): ArtifactDocument {
  const extra = podcast.extra as AnalystPodcastExtra;
  const metadata = extra?.metadata;

  return {
    slug: `podcast-${podcast.id}`,
    type: "podcast",

    title: metadata?.title || "",
    description: metadata?.showNotes || "",

    kind: null,

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

    const document = reportToDocument(report);
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

    const document = podcastToDocument(podcast);
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
export async function deleteArtifact(type: ArtifactType, id: number): Promise<void> {
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
 * 全量同步所有 Reports 和 Podcasts
 * 用于初始化或重建索引
 */
export async function syncAllArtifacts(options?: {
  reportFilter?: Prisma.AnalystReportWhereInput;
  podcastFilter?: Prisma.AnalystPodcastWhereInput;
  limit?: number;
}): Promise<{
  reportsCount: number;
  podcastsCount: number;
}> {
  logger.info({
    msg: "Starting full artifacts sync",
    reportFilter: options?.reportFilter,
    podcastFilter: options?.podcastFilter,
    limit: options?.limit,
    indexName: INDEXES.ARTIFACTS,
  });

  try {
    const index = meilisearchClient.index(INDEXES.ARTIFACTS);

    // 检查索引是否存在
    try {
      const indexInfo = await index.fetchInfo();
      logger.info({
        msg: "Index exists",
        indexInfo: {
          uid: indexInfo.uid,
          primaryKey: indexInfo.primaryKey,
          createdAt: indexInfo.createdAt,
          updatedAt: indexInfo.updatedAt,
        },
      });
    } catch (error) {
      logger.error({
        msg: "Index does not exist or cannot be accessed",
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("Index not found. Please run 'init' command first.");
    }

    // 获取所有 reports
    logger.info({ msg: "Fetching reports from database", filter: options?.reportFilter });
    const reports = await prismaRO.analystReport.findMany({
      where: options?.reportFilter,
      orderBy: { createdAt: "desc" },
      take: options?.limit,
    });
    logger.info({ msg: "Reports fetched", count: reports.length });

    // 获取所有 podcasts
    logger.info({ msg: "Fetching podcasts from database", filter: options?.podcastFilter });
    const podcasts = await prismaRO.analystPodcast.findMany({
      where: options?.podcastFilter,
      orderBy: { createdAt: "desc" },
      take: options?.limit,
    });
    logger.info({ msg: "Podcasts fetched", count: podcasts.length });

    // 转换为文档
    logger.info({ msg: "Converting reports to documents" });
    const reportDocuments = reports.map(reportToDocument);
    logger.info({
      msg: "Report documents created",
      count: reportDocuments.length,
      sampleSlugs: reportDocuments.slice(0, 3).map((d) => d.slug),
    });

    logger.info({ msg: "Converting podcasts to documents" });
    const podcastDocuments = podcasts.map(podcastToDocument);
    logger.info({
      msg: "Podcast documents created",
      count: podcastDocuments.length,
      sampleSlugs: podcastDocuments.slice(0, 3).map((d) => d.slug),
    });

    const allDocuments = [...reportDocuments, ...podcastDocuments];
    logger.info({
      msg: "All documents prepared",
      totalCount: allDocuments.length,
      reportsCount: reportDocuments.length,
      podcastsCount: podcastDocuments.length,
    });

    if (allDocuments.length === 0) {
      logger.warn({ msg: "No documents to sync" });
      return {
        reportsCount: 0,
        podcastsCount: 0,
      };
    }

    // 批量添加文档（分批处理，每批 1000 个）
    const BATCH_SIZE = 1000;
    const totalBatches = Math.ceil(allDocuments.length / BATCH_SIZE);
    logger.info({ msg: "Starting batch processing", totalBatches, batchSize: BATCH_SIZE });

    for (let i = 0; i < allDocuments.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const batch = allDocuments.slice(i, i + BATCH_SIZE);

      logger.info({
        msg: "Processing batch",
        batchNumber,
        totalBatches,
        batchSize: batch.length,
        sampleSlugs: batch.slice(0, 3).map((d) => d.slug),
      });

      const task = index.addDocuments(batch);
      logger.info({ msg: "Documents added to Meilisearch, waiting for task", batchNumber });

      const result = await task.waitTask();
      logger.info({
        msg: "Batch task completed",
        batchNumber,
        taskUid: result.uid,
        status: result.status,
        indexedDocuments: result.details?.indexedDocuments,
        receivedDocuments: result.details?.receivedDocuments,
      });

      if (result.status === "failed") {
        logger.error({
          msg: "Batch sync failed",
          batchNumber,
          error: result.error,
        });
        throw new Error(`Batch ${batchNumber} failed: ${JSON.stringify(result.error)}`);
      }
    }

    logger.info({
      msg: "Full artifacts sync completed",
      reportsCount: reports.length,
      podcastsCount: podcasts.length,
      totalCount: allDocuments.length,
    });

    return {
      reportsCount: reports.length,
      podcastsCount: podcasts.length,
    };
  } catch (error) {
    logger.error({
      msg: "Failed to sync all artifacts",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
