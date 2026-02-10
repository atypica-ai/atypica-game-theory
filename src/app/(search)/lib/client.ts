import "server-only";

import { MeiliSearch } from "meilisearch";

/**
 * Meilisearch 客户端配置
 * 使用云端托管的 Meilisearch 实例
 */

if (!process.env.MEILISEARCH_HOST) {
  throw new Error("MEILISEARCH_HOST environment variable is required");
}

if (!process.env.MEILISEARCH_MASTER_KEY) {
  throw new Error("MEILISEARCH_MASTER_KEY environment variable is required");
}

/**
 * Meilisearch 客户端实例（服务端使用，拥有完全权限）
 */
export const meilisearchClient = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST,
  apiKey: process.env.MEILISEARCH_MASTER_KEY,
  timeout: 10000, // 10 秒超时
});

/**
 * 索引名称配置（从环境变量读取）
 */
const INDEXES_CONFIG = JSON.parse(process.env.MEILISEARCH_INDEXES || "{}") as Record<
  string,
  string
>;

export const INDEXES = {
  ARTIFACTS: INDEXES_CONFIG.artifacts || "artifacts",
} as const;

/**
 * 初始化索引配置
 * 需要在首次使用前调用，或者通过脚本初始化
 */
export async function initializeArtifactsIndex() {
  const indexName = INDEXES.ARTIFACTS;

  try {
    // 尝试获取索引，如果不存在会抛出错误
    await meilisearchClient.getIndex(indexName);
  } catch {
    // 索引不存在，创建新索引
    await meilisearchClient.createIndex(indexName, {
      primaryKey: "slug",
    });
  }

  // 配置索引设置
  const index = meilisearchClient.index(indexName);

  await index.updateSettings({
    // 可搜索字段（按优先级排序）
    searchableAttributes: ["title", "description", "kind"],

    // 可过滤字段
    filterableAttributes: ["type", "kind", "isFeatured"],

    // 可排序字段
    sortableAttributes: ["createdAt"],

    // 显示字段
    displayedAttributes: ["slug", "type", "title", "description", "kind", "isFeatured", "createdAt"],

    // 分面搜索配置
    faceting: {
      maxValuesPerFacet: 100,
    },
  });

  return index;
}
