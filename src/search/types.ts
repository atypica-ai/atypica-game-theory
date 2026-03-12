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
  userId: number; // 创建者 ID
  teamId: number | null; // 团队 ID（预留）

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
  userId?: number;
  teamId?: number;
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

/**
 * Meilisearch 中的 Persona 文档结构
 * 只存储搜索必需的字段，完整数据从数据库查询
 */
export interface PersonaDocument {
  slug: string; // "persona-{id}" 格式，用作主键

  // 搜索字段
  name: string;
  tags: string[];
  prompt: string;

  // 过滤字段
  tier: number;
  locale: string;
  userId: number | null;
  teamId: number | null;
  archived: boolean; // 归档标记

  // 排序字段
  createdAt: number; // Unix timestamp
}

/**
 * Personas 搜索参数
 */
export interface PersonasSearchParams {
  query: string;
  tiers?: number[];
  locales?: string[];
  userId?: number;
  teamId?: number;
  archived?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Personas 搜索结果
 */
export interface PersonasSearchResult {
  hits: PersonaDocument[];
  query: string;
  processingTimeMs: number;
  hitsPerPage: number;
  page: number;
  totalPages: number;
  totalHits: number;
}

/**
 * Project 类型
 */
export type ProjectType = "study" | "universal" | "interview" | "panel";

/**
 * Meilisearch 中的 Project 文档结构
 * 只存储搜索必需的字段，完整数据从数据库查询
 */
export interface ProjectDocument {
  slug: string; // "study-{id}" | "universal-{id}" | "interview-{id}" | "panel-{id}"
  type: ProjectType;

  // 搜索字段
  title: string;
  description: string;

  // 过滤字段
  userId: number | null;
  teamId: number | null;
  archived: boolean; // 归档标记

  // 排序字段
  createdAt: number; // Unix timestamp
}

/**
 * Projects 搜索参数
 */
export interface ProjectsSearchParams {
  query: string;
  type?: ProjectType;
  userId?: number;
  archived?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Projects 搜索结果
 */
export interface ProjectsSearchResult {
  hits: ProjectDocument[];
  query: string;
  processingTimeMs: number;
  hitsPerPage: number;
  page: number;
  totalPages: number;
  totalHits: number;
}
