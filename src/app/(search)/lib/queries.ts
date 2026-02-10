import "server-only";

import { rootLogger } from "@/lib/logging";
import { ArtifactDocument, ArtifactsSearchParams, ArtifactsSearchResult } from "../types";
import { INDEXES, meilisearchClient } from "./client";

const logger = rootLogger.child({ module: "search-queries" });

/**
 * 搜索 Artifacts（Reports + Podcasts）
 * 只返回匹配的文档，前端用 IDs 去数据库查完整数据
 */
export async function searchArtifacts(
  params: ArtifactsSearchParams,
): Promise<ArtifactsSearchResult> {
  const { query, type, kind, page = 1, pageSize = 20 } = params;

  try {
    const index = meilisearchClient.index<ArtifactDocument>(INDEXES.ARTIFACTS);

    // 构建过滤条件
    const filters: string[] = [];

    if (type) {
      filters.push(`type = "${type}"`);
    }

    if (kind) {
      filters.push(`kind = "${kind}"`);
    }

    // 执行搜索
    const searchResults = await index.search(query, {
      filter: filters.length > 0 ? filters : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sort: ["createdAt:desc"], // 默认按创建时间降序
      attributesToHighlight: ["title", "description"],
      attributesToCrop: ["description"],
      cropLength: 200,
    });

    logger.info({
      msg: "Artifacts search executed",
      query,
      filters: filters.length > 0 ? filters : "none",
      hits: searchResults.hits.length,
      processingTime: searchResults.processingTimeMs,
    });

    return {
      hits: searchResults.hits,
      query: searchResults.query,
      processingTimeMs: searchResults.processingTimeMs,
      hitsPerPage: pageSize,
      page,
      totalPages: Math.ceil(searchResults.estimatedTotalHits / pageSize),
      totalHits: searchResults.estimatedTotalHits,
    };
  } catch (error) {
    logger.error({
      msg: "Artifacts search failed",
      query,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 获取 Artifacts 的分面统计
 * 用于过滤器 UI
 */
export async function getArtifactsFacets(query: string = "") {
  try {
    const index = meilisearchClient.index<ArtifactDocument>(INDEXES.ARTIFACTS);

    const results = await index.search(query, {
      limit: 0, // 不返回文档，只要分面统计
      facets: ["type", "kind"],
    });

    return {
      facets: results.facetDistribution || {},
      facetStats: results.facetStats || {},
    };
  } catch (error) {
    logger.error({
      msg: "Failed to get artifacts facets",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
