import "server-only";

import { MeiliSearch } from "meilisearch";

/**
 * Meilisearch 客户端配置
 * 使用云端托管的 Meilisearch 实例
 * 延迟初始化，避免构建时检查环境变量
 */

let _meilisearchClient: MeiliSearch | null = null;

/**
 * 获取 Meilisearch 客户端实例（延迟初始化）
 */
function getMeilisearchClient(): MeiliSearch {
  if (_meilisearchClient) {
    return _meilisearchClient;
  }

  if (!process.env.MEILISEARCH_HOST) {
    throw new Error("MEILISEARCH_HOST environment variable is required");
  }

  if (!process.env.MEILISEARCH_MASTER_KEY) {
    throw new Error("MEILISEARCH_MASTER_KEY environment variable is required");
  }

  _meilisearchClient = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST,
    apiKey: process.env.MEILISEARCH_MASTER_KEY,
    timeout: 10000, // 10 秒超时
  });

  return _meilisearchClient;
}

/**
 * Meilisearch 客户端实例（服务端使用，拥有完全权限）
 * 通过 getter 实现延迟初始化
 */
export const meilisearchClient = new Proxy({} as MeiliSearch, {
  get(_target, prop) {
    const client = getMeilisearchClient();
    const value = client[prop as keyof MeiliSearch];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/**
 * 索引名称配置（从环境变量读取）
 */
function getIndexesConfig() {
  return JSON.parse(process.env.MEILISEARCH_INDEXES || "{}") as Record<string, string>;
}

export const INDEXES = {
  get ARTIFACTS() {
    return getIndexesConfig().artifacts || "artifacts";
  },
  get PERSONAS() {
    return getIndexesConfig().personas || "personas";
  },
} as const;

/**
 * 初始化 Artifacts 索引配置
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

/**
 * 初始化 Personas 索引配置
 * 需要在首次使用前调用，或者通过脚本初始化
 */
export async function initializePersonasIndex() {
  const indexName = INDEXES.PERSONAS;

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
    searchableAttributes: ["name", "tags", "prompt"],

    // 可过滤字段
    filterableAttributes: ["tier", "locale"],

    // 可排序字段
    sortableAttributes: ["createdAt"],

    // 显示字段
    displayedAttributes: ["slug", "name", "tags", "prompt", "tier", "locale", "createdAt"],

    // 分面搜索配置
    faceting: {
      maxValuesPerFacet: 100,
    },
  });

  return index;
}
