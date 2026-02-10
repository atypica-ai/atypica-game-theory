import { loadEnvConfig } from "@next/env";
import "../mock-server-only";

/**
 * Meilisearch 搜索管理脚本
 *
 * 用法:
 *   pnpm tsx scripts/admin/search-management.ts init
 *   pnpm tsx scripts/admin/search-management.ts sync
 *   pnpm tsx scripts/admin/search-management.ts sync --filter '{"userId":2}'
 *   pnpm tsx scripts/admin/search-management.ts sync --filter '{"userId":2}' --limit 100
 *   pnpm tsx scripts/admin/search-management.ts sync --start-from-report-id 1900
 *   pnpm tsx scripts/admin/search-management.ts sync --only-podcasts
 */

import { rootLogger } from "@/lib/logging";
import { FeaturedItemResourceType, Prisma } from "@/prisma/client";
const logger = rootLogger.child({ script: "search-management" });

const FETCH_BATCH_SIZE = 30; // 每批并行获取 30 条

/**
 * 全量同步所有 Reports 和 Podcasts
 * 用于初始化或重建索引
 */
export async function syncAllArtifacts(options?: {
  reportFilter?: Prisma.AnalystReportWhereInput;
  podcastFilter?: Prisma.AnalystPodcastWhereInput;
  limit?: number;
  startFromReportId?: number; // 断点续传：从某个 report ID 开始
  startFromPodcastId?: number; // 断点续传：从某个 podcast ID 开始
  syncReports?: boolean; // 是否同步 reports，默认 true
  syncPodcasts?: boolean; // 是否同步 podcasts，默认 true
}): Promise<{
  reportsCount: number;
  podcastsCount: number;
}> {
  const { podcastToDocument, reportToDocument } = await import("@/app/(search)/lib/sync");
  const { INDEXES, meilisearchClient } = await import("@/app/(search)/lib/client");
  const { prismaRO } = await import("@/prisma/prisma");

  const {
    reportFilter,
    podcastFilter,
    limit,
    startFromReportId,
    startFromPodcastId,
    syncReports = true,
    syncPodcasts = true,
  } = options || {};

  logger.info({
    msg: "Starting full artifacts sync",
    reportFilter,
    podcastFilter,
    limit,
    startFromReportId,
    startFromPodcastId,
    syncReports,
    syncPodcasts,
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

    // Step 1: 获取所有 IDs（只查询 ID，避免内存溢出）
    let reportIds: number[] = [];
    if (syncReports) {
      const reportWhere: Prisma.AnalystReportWhereInput = {
        ...reportFilter,
        ...(startFromReportId ? { id: { gt: startFromReportId } } : {}),
      };

      logger.info({
        msg: "Fetching report IDs from database",
        filter: reportWhere,
        startFromReportId,
      });

      const reportIdRecords = await prismaRO.analystReport.findMany({
        where: reportWhere,
        select: { id: true },
        orderBy: { id: "asc" }, // 按 ID 升序，便于断点续传
        take: limit,
      });
      reportIds = reportIdRecords.map((r) => r.id);

      logger.info({
        msg: "Report IDs fetched",
        count: reportIds.length,
        firstId: reportIds[0],
        lastId: reportIds[reportIds.length - 1],
      });
    }

    let podcastIds: number[] = [];
    if (syncPodcasts) {
      const podcastWhere: Prisma.AnalystPodcastWhereInput = {
        ...podcastFilter,
        ...(startFromPodcastId ? { id: { gt: startFromPodcastId } } : {}),
      };

      logger.info({
        msg: "Fetching podcast IDs from database",
        filter: podcastWhere,
        startFromPodcastId,
      });

      const podcastIdRecords = await prismaRO.analystPodcast.findMany({
        where: podcastWhere,
        select: { id: true },
        orderBy: { id: "asc" }, // 按 ID 升序，便于断点续传
        take: limit,
      });
      podcastIds = podcastIdRecords.map((p) => p.id);

      logger.info({
        msg: "Podcast IDs fetched",
        count: podcastIds.length,
        firstId: podcastIds[0],
        lastId: podcastIds[podcastIds.length - 1],
      });
    }

    // Step 2: 分批并行获取完整数据并同步
    let totalReportsSynced = 0;
    let totalPodcastsSynced = 0;

    // 处理 Reports
    if (reportIds.length > 0) {
      logger.info({
        msg: "Starting report sync in batches",
        totalReports: reportIds.length,
        fetchBatchSize: FETCH_BATCH_SIZE,
      });

      for (let i = 0; i < reportIds.length; i += FETCH_BATCH_SIZE) {
        const batchIds = reportIds.slice(i, i + FETCH_BATCH_SIZE);
        const batchNumber = Math.floor(i / FETCH_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(reportIds.length / FETCH_BATCH_SIZE);

        logger.info({
          msg: "Fetching report batch",
          batchNumber,
          totalBatches,
          batchSize: batchIds.length,
        });

        // 并行获取这批 reports 的完整数据和 featured 状态
        const [reports, featuredItems] = await Promise.all([
          prismaRO.analystReport.findMany({
            where: { id: { in: batchIds } },
          }),
          prismaRO.featuredItem.findMany({
            where: {
              resourceType: FeaturedItemResourceType.AnalystReport,
              resourceId: { in: batchIds },
            },
            select: { resourceId: true },
          }),
        ]);

        const featuredReportIds = new Set(featuredItems.map((f) => f.resourceId));

        // 转换为文档
        const documents = reports.map((report) =>
          reportToDocument(report, featuredReportIds.has(report.id)),
        );

        // 同步到 Meilisearch
        if (documents.length > 0) {
          const task = index.addDocuments(documents);
          const result = await task.waitTask();

          if (result.status === "failed") {
            logger.error({
              msg: "Report batch sync failed",
              batchNumber,
              error: result.error,
            });
            throw new Error(`Report batch ${batchNumber} failed: ${JSON.stringify(result.error)}`);
          }

          totalReportsSynced += documents.length;
          const lastProcessedId = Math.max(...reports.map((r) => r.id));
          logger.info({
            msg: "Report batch synced",
            batchNumber,
            totalBatches,
            batchSize: documents.length,
            totalSynced: totalReportsSynced,
            lastProcessedId, // 最后处理的 ID，用于断点续传
          });
        }
      }
    }

    // 处理 Podcasts
    if (podcastIds.length > 0) {
      logger.info({
        msg: "Starting podcast sync in batches",
        totalPodcasts: podcastIds.length,
        fetchBatchSize: FETCH_BATCH_SIZE,
      });

      for (let i = 0; i < podcastIds.length; i += FETCH_BATCH_SIZE) {
        const batchIds = podcastIds.slice(i, i + FETCH_BATCH_SIZE);
        const batchNumber = Math.floor(i / FETCH_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(podcastIds.length / FETCH_BATCH_SIZE);

        logger.info({
          msg: "Fetching podcast batch",
          batchNumber,
          totalBatches,
          batchSize: batchIds.length,
        });

        // 并行获取这批 podcasts 的完整数据和 featured 状态
        const [podcasts, featuredItems] = await Promise.all([
          prismaRO.analystPodcast.findMany({
            where: { id: { in: batchIds } },
          }),
          prismaRO.featuredItem.findMany({
            where: {
              resourceType: FeaturedItemResourceType.AnalystPodcast,
              resourceId: { in: batchIds },
            },
            select: { resourceId: true },
          }),
        ]);

        const featuredPodcastIds = new Set(featuredItems.map((f) => f.resourceId));

        // 转换为文档
        const documents = podcasts.map((podcast) =>
          podcastToDocument(podcast, featuredPodcastIds.has(podcast.id)),
        );

        // 同步到 Meilisearch
        if (documents.length > 0) {
          const task = index.addDocuments(documents);
          const result = await task.waitTask();

          if (result.status === "failed") {
            logger.error({
              msg: "Podcast batch sync failed",
              batchNumber,
              error: result.error,
            });
            throw new Error(`Podcast batch ${batchNumber} failed: ${JSON.stringify(result.error)}`);
          }

          totalPodcastsSynced += documents.length;
          const lastProcessedId = Math.max(...podcasts.map((p) => p.id));
          logger.info({
            msg: "Podcast batch synced",
            batchNumber,
            totalBatches,
            batchSize: documents.length,
            totalSynced: totalPodcastsSynced,
            lastProcessedId, // 最后处理的 ID，用于断点续传
          });
        }
      }
    }

    logger.info({
      msg: "Full artifacts sync completed",
      reportsCount: totalReportsSynced,
      podcastsCount: totalPodcastsSynced,
      totalCount: totalReportsSynced + totalPodcastsSynced,
    });

    return {
      reportsCount: totalReportsSynced,
      podcastsCount: totalPodcastsSynced,
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

function parseArgs(args: string[]): {
  filter?: string;
  limit?: number;
  startFromReportId?: number;
  startFromPodcastId?: number;
  onlyReports?: boolean;
  onlyPodcasts?: boolean;
} {
  const result: {
    filter?: string;
    limit?: number;
    startFromReportId?: number;
    startFromPodcastId?: number;
    onlyReports?: boolean;
    onlyPodcasts?: boolean;
  } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--filter" || arg === "-f") && i + 1 < args.length) {
      result.filter = args[i + 1];
      i++;
    } else if ((arg === "--limit" || arg === "-l") && i + 1 < args.length) {
      const limit = parseInt(args[i + 1], 10);
      if (!isNaN(limit) && limit > 0) {
        result.limit = limit;
      }
      i++;
    } else if (arg === "--start-from-report-id" && i + 1 < args.length) {
      const id = parseInt(args[i + 1], 10);
      if (!isNaN(id) && id > 0) {
        result.startFromReportId = id;
      }
      i++;
    } else if (arg === "--start-from-podcast-id" && i + 1 < args.length) {
      const id = parseInt(args[i + 1], 10);
      if (!isNaN(id) && id > 0) {
        result.startFromPodcastId = id;
      }
      i++;
    } else if (arg === "--only-reports") {
      result.onlyReports = true;
    } else if (arg === "--only-podcasts") {
      result.onlyPodcasts = true;
    }
  }

  return result;
}

async function main() {
  loadEnvConfig(process.cwd());

  const { initializeArtifactsIndex } = await import("@/app/(search)/lib/client");

  const command = process.argv[2];

  if (!command || !["init", "sync"].includes(command)) {
    console.error("Usage: pnpm tsx scripts/admin/search-management.ts [init|sync]");
    console.error("");
    console.error("Commands:");
    console.error("  init  - Initialize Meilisearch index");
    console.error("  sync  - Sync all artifacts to Meilisearch");
    console.error("");
    console.error("Sync options:");
    console.error("  --filter, -f               - JSON filter (e.g., '{\"userId\":2}')");
    console.error("  --limit, -l                - Limit number of records (e.g., 100)");
    console.error("  --start-from-report-id     - Resume report sync from specific ID");
    console.error("  --start-from-podcast-id    - Resume podcast sync from specific ID");
    console.error("  --only-reports             - Sync only reports (skip podcasts)");
    console.error("  --only-podcasts            - Sync only podcasts (skip reports)");
    console.error("");
    console.error("Examples:");
    console.error("  pnpm tsx scripts/admin/search-management.ts sync");
    console.error("  pnpm tsx scripts/admin/search-management.ts sync --filter '{\"userId\":2}'");
    console.error("  pnpm tsx scripts/admin/search-management.ts sync -f '{\"userId\":2}' -l 100");
    console.error("  pnpm tsx scripts/admin/search-management.ts sync --start-from-report-id 1900");
    console.error("  pnpm tsx scripts/admin/search-management.ts sync --only-podcasts");
    process.exit(1);
  }

  try {
    if (command === "init") {
      logger.info("Initializing Meilisearch index...");
      await initializeArtifactsIndex();
      logger.info("Index initialized successfully");
    } else if (command === "sync") {
      logger.info({
        msg: "Parsing sync arguments",
        argv: process.argv,
        argsToProcess: process.argv.slice(3),
      });

      const args = parseArgs(process.argv.slice(3));

      logger.info({
        msg: "Arguments parsed",
        filter: args.filter,
        limit: args.limit,
        startFromReportId: args.startFromReportId,
        startFromPodcastId: args.startFromPodcastId,
        onlyReports: args.onlyReports,
        onlyPodcasts: args.onlyPodcasts,
      });

      let reportFilter: Prisma.AnalystReportWhereInput | undefined;
      let podcastFilter: Prisma.AnalystPodcastWhereInput | undefined;

      if (args.filter) {
        try {
          logger.info({
            msg: "Parsing filter JSON",
            filterString: args.filter,
          });

          const filterObj = JSON.parse(args.filter);
          reportFilter = filterObj;
          podcastFilter = filterObj;

          logger.info({
            msg: "Filter parsed successfully",
            filterObj,
          });
        } catch (error) {
          logger.error({
            msg: "Invalid filter JSON",
            filter: args.filter,
            error: error instanceof Error ? error.message : String(error),
          });
          process.exit(1);
        }
      }

      // Determine what to sync based on flags
      const syncReports = !args.onlyPodcasts; // Sync reports unless only-podcasts flag
      const syncPodcasts = !args.onlyReports; // Sync podcasts unless only-reports flag

      logger.info({
        msg: "Starting full artifacts sync",
        reportFilter,
        podcastFilter,
        limit: args.limit,
        startFromReportId: args.startFromReportId,
        startFromPodcastId: args.startFromPodcastId,
        syncReports,
        syncPodcasts,
      });

      const result = await syncAllArtifacts({
        reportFilter,
        podcastFilter,
        limit: args.limit,
        startFromReportId: args.startFromReportId,
        startFromPodcastId: args.startFromPodcastId,
        syncReports,
        syncPodcasts,
      });

      logger.info({
        msg: "Full sync completed",
        reportsCount: result.reportsCount,
        podcastsCount: result.podcastsCount,
        totalCount: result.reportsCount + result.podcastsCount,
      });
    }

    process.exit(0);
  } catch (error) {
    logger.error({
      msg: `Command '${command}' failed`,
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();
