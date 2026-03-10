import "server-only";

import { rootLogger } from "@/lib/logging";
import {
  ArtifactDocument,
  ArtifactsSearchParams,
  ArtifactsSearchResult,
  PersonaDocument,
  PersonasSearchParams,
  PersonasSearchResult,
  ProjectDocument,
  ProjectsSearchParams,
  ProjectsSearchResult,
} from "../types";
import { INDEXES, meilisearchClient } from "./client";

const logger = rootLogger.child({ module: "search-queries" });

/**
 * 搜索 Artifacts（Reports + Podcasts）
 * 只返回匹配的文档，前端用 IDs 去数据库查完整数据
 */
export async function searchArtifacts(
  params: ArtifactsSearchParams,
): Promise<ArtifactsSearchResult> {
  const { query, type, kind, isFeatured, userId, teamId, page = 1, pageSize = 20 } = params;

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

    if (isFeatured !== undefined) {
      filters.push(`isFeatured = ${isFeatured}`);
    }

    if (userId !== undefined) {
      filters.push(`userId = ${userId}`);
    }

    if (teamId !== undefined) {
      filters.push(`teamId = ${teamId}`);
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

/**
 * 搜索 Personas
 * 只返回匹配的文档，前端用 IDs 去数据库查完整数据
 */
export async function searchPersonas(params: PersonasSearchParams): Promise<PersonasSearchResult> {
  const { query, tiers, locales, userId, teamId, archived, page = 1, pageSize = 20 } = params;

  try {
    const index = meilisearchClient.index<PersonaDocument>(INDEXES.PERSONAS);

    // 构建过滤条件
    const filters: string[] = [];

    if (tiers && tiers.length > 0) {
      // tier IN [2, 3] -> tier = 2 OR tier = 3
      const tierFilters = tiers.map((tier) => `tier = ${tier}`).join(" OR ");
      filters.push(`(${tierFilters})`);
    }

    if (locales && locales.length > 0) {
      // locale IN ["zh-CN", "en-US"] -> locale = "zh-CN" OR locale = "en-US"
      const localeFilters = locales.map((locale) => `locale = "${locale}"`).join(" OR ");
      filters.push(`(${localeFilters})`);
    }

    if (userId !== undefined) {
      filters.push(`userId = ${userId}`);
    }

    if (teamId !== undefined) {
      filters.push(`teamId = ${teamId}`);
    }

    if (archived === true) {
      filters.push(`archived = true`);
    } else if (archived === false) {
      filters.push(`archived IS NULL OR archived = false`);
    }

    // 执行搜索
    const searchResults = await index.search(query, {
      filter: filters.length > 0 ? filters : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sort: ["createdAt:desc"], // 默认按创建时间降序
      attributesToHighlight: ["name", "prompt"],
      attributesToCrop: ["prompt"],
      cropLength: 200,
    });

    logger.info({
      msg: "Personas search executed",
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
      msg: "Personas search failed",
      query,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 获取 Personas 的分面统计
 * 用于过滤器 UI
 */
export async function getPersonasFacets(query: string = "") {
  try {
    const index = meilisearchClient.index<PersonaDocument>(INDEXES.PERSONAS);

    const results = await index.search(query, {
      limit: 0, // 不返回文档，只要分面统计
      facets: ["tier", "locale"],
    });

    return {
      facets: results.facetDistribution || {},
      facetStats: results.facetStats || {},
    };
  } catch (error) {
    logger.error({
      msg: "Failed to get personas facets",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * 搜索 Projects
 * 只返回匹配的文档，前端用 slug 解析 type+id 去数据库查完整数据
 */
export async function searchProjects(params: ProjectsSearchParams): Promise<ProjectsSearchResult> {
  const { query, type, userId, archived, page = 1, pageSize = 20 } = params;

  try {
    const index = meilisearchClient.index<ProjectDocument>(INDEXES.PROJECTS);

    const filters: string[] = [];

    if (type) {
      filters.push(`type = "${type}"`);
    }

    if (userId !== undefined) {
      filters.push(`userId = ${userId}`);
    }

    if (archived === true) {
      filters.push(`archived = true`);
    } else if (archived === false) {
      filters.push(`archived IS NULL OR archived = false`);
    }

    const searchResults = await index.search(query, {
      filter: filters.length > 0 ? filters : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      sort: ["createdAt:desc"],
      attributesToHighlight: ["title", "description"],
      attributesToCrop: ["description"],
      cropLength: 200,
    });

    logger.info({
      msg: "Projects search executed",
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
      msg: "Projects search failed",
      query,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
