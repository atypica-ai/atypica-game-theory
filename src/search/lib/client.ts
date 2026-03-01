import "server-only";

import { MeiliSearch } from "meilisearch";

/**
 * Meilisearch 客户端配置
 *
 * 两个客户端，职责分离：
 * - meilisearchClient:      API Key，运行时使用（搜索、文档读写）
 * - meilisearchAdminClient: Master Key，仅管理工具使用（创建索引、配置 settings）
 */

// ============================================================
// Runtime Client (API Key) — 搜索、添加/删除文档
// ============================================================

let _meilisearchClient: MeiliSearch | null = null;

function getMeilisearchClient(): MeiliSearch {
  if (_meilisearchClient) {
    return _meilisearchClient;
  }

  if (!process.env.MEILISEARCH_HOST) {
    throw new Error("MEILISEARCH_HOST environment variable is required");
  }

  if (!process.env.MEILISEARCH_API_KEY) {
    throw new Error("MEILISEARCH_API_KEY environment variable is required");
  }

  _meilisearchClient = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST,
    apiKey: process.env.MEILISEARCH_API_KEY,
    timeout: 10000,
  });

  return _meilisearchClient;
}

/**
 * 运行时客户端（API Key）
 * 用于搜索和文档操作，不能创建/删除索引或管理 API Key
 */
export const meilisearchClient = new Proxy({} as MeiliSearch, {
  get(_target, prop) {
    const client = getMeilisearchClient();
    const value = client[prop as keyof MeiliSearch];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// ============================================================
// Admin Client (Master Key) — 仅用于索引管理（scripts/admin 工具）
// ============================================================

let _meilisearchAdminClient: MeiliSearch | null = null;

function getMeilisearchAdminClient(): MeiliSearch {
  if (_meilisearchAdminClient) {
    return _meilisearchAdminClient;
  }

  if (!process.env.MEILISEARCH_HOST) {
    throw new Error("MEILISEARCH_HOST environment variable is required");
  }

  if (!process.env.MEILISEARCH_MASTER_KEY) {
    throw new Error(
      "MEILISEARCH_MASTER_KEY environment variable is required (only needed for index management in scripts)",
    );
  }

  _meilisearchAdminClient = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST,
    apiKey: process.env.MEILISEARCH_MASTER_KEY,
    timeout: 10000,
  });

  return _meilisearchAdminClient;
}

/**
 * 管理客户端（Master Key）
 * 仅用于创建/配置索引，只在 scripts/admin 工具中使用
 * 运行时服务不要使用此客户端
 */
export const meilisearchAdminClient = new Proxy({} as MeiliSearch, {
  get(_target, prop) {
    const client = getMeilisearchAdminClient();
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
  get PROJECTS() {
    return getIndexesConfig().projects || "projects";
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
    await meilisearchAdminClient.getIndex(indexName);
  } catch {
    // 索引不存在，创建新索引
    await meilisearchAdminClient.createIndex(indexName, {
      primaryKey: "slug",
    });
  }

  // 配置索引设置
  const index = meilisearchAdminClient.index(indexName);

  await index.updateSettings({
    // 可搜索字段（按优先级排序）
    searchableAttributes: ["title", "description", "kind"],

    // 可过滤字段
    filterableAttributes: ["type", "kind", "isFeatured", "userId", "teamId"],

    // 可排序字段
    sortableAttributes: ["createdAt"],

    // 显示字段
    displayedAttributes: [
      "slug",
      "type",
      "title",
      "description",
      "kind",
      "isFeatured",
      "userId",
      "teamId",
      "createdAt",
    ],

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
    await meilisearchAdminClient.getIndex(indexName);
  } catch {
    // 索引不存在，创建新索引
    await meilisearchAdminClient.createIndex(indexName, {
      primaryKey: "slug",
    });
  }

  // 配置索引设置
  const index = meilisearchAdminClient.index(indexName);

  await index.updateSettings({
    // 可搜索字段（按优先级排序）
    searchableAttributes: ["name", "tags", "prompt"],

    // 可过滤字段
    filterableAttributes: ["tier", "locale", "userId", "teamId"],

    // 可排序字段
    sortableAttributes: ["createdAt"],

    // 显示字段
    displayedAttributes: [
      "slug",
      "name",
      "tags",
      "prompt",
      "tier",
      "locale",
      "userId",
      "teamId",
      "createdAt",
    ],

    // 分面搜索配置
    faceting: {
      maxValuesPerFacet: 100,
    },
  });

  return index;
}

/**
 * 初始化 Projects 索引配置
 * 需要在首次使用前调用，或者通过脚本初始化
 */
export async function initializeProjectsIndex() {
  const indexName = INDEXES.PROJECTS;

  try {
    await meilisearchAdminClient.getIndex(indexName);
  } catch {
    await meilisearchAdminClient.createIndex(indexName, {
      primaryKey: "slug",
    });
  }

  const index = meilisearchAdminClient.index(indexName);

  await index.updateSettings({
    searchableAttributes: ["title", "description"],

    filterableAttributes: ["type", "userId", "teamId"],

    sortableAttributes: ["createdAt"],

    displayedAttributes: [
      "slug",
      "type",
      "title",
      "description",
      "userId",
      "teamId",
      "createdAt",
    ],

    faceting: {
      maxValuesPerFacet: 100,
    },
  });

  return index;
}
