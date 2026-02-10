/**
 * 搜索相关的类型定义
 */

/**
 * Artifact 类型：report 或 podcast
 */
export type ArtifactType = "report" | "podcast";

/**
 * Meilisearch 中的 Artifact 文档结构
 * 只存储搜索必需的字段，完整数据从数据库查询
 */
export interface ArtifactDocument {
  slug: string; // "report-1" 或 "podcast-2" 格式，用作主键
  type: ArtifactType;

  // 搜索字段
  title: string;
  description: string;

  // 过滤字段
  kind: string | null; // analystKind，可能为空
  isFeatured: boolean; // 是否为精选内容

  // 排序字段
  createdAt: number; // Unix timestamp
}

/**
 * Artifacts 搜索参数
 */
export interface ArtifactsSearchParams {
  query: string;
  type?: ArtifactType;
  kind?: string;
  isFeatured?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * 搜索结果
 */
export interface ArtifactsSearchResult {
  hits: ArtifactDocument[];
  query: string;
  processingTimeMs: number;
  hitsPerPage: number;
  page: number;
  totalPages: number;
  totalHits: number;
}
