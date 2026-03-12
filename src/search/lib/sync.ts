import "server-only";

import { UserChatContext } from "@/app/(study)/context/types";
import { rootLogger } from "@/lib/logging";
import {
  AnalystPodcast,
  AnalystReport,
  FeaturedItemResourceType,
  InterviewProject,
  Persona,
  PersonaPanel,
  UserChat,
} from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import {
  ArtifactDocument,
  ArtifactType,
  PersonaDocument,
  ProjectDocument,
  ProjectType,
} from "../types";
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
  const extra = report.extra;

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
  const metadata = podcast.extra?.metadata;

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
    // logger.info({ msg: "Report converted to document", reportId, document });

    const index = meilisearchClient.index(INDEXES.ARTIFACTS);
    const task = index.addDocuments([document]);

    logger.info({ msg: "Document added to Meilisearch, waiting for task", reportId });
    const result = await task.waitTask({ timeout: 5000 }).catch(() => {
      // 超时没事，meili 后台只是在等待，这里 warn 一下继续即可
      logger.warn({ msg: "Failed to wait for task", reportId });
    });
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
    // logger.info({ msg: "Podcast converted to document", podcastId, document });

    const index = meilisearchClient.index(INDEXES.ARTIFACTS);
    const task = index.addDocuments([document]);

    logger.info({ msg: "Document added to Meilisearch, waiting for task", podcastId });
    const result = await task.waitTask({ timeout: 5000 }).catch(() => {
      // 超时没事，meili 后台只是在等待，这里 warn 一下继续即可
      logger.warn({ msg: "Failed to wait for task", podcastId });
    });
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

    archived: Boolean(persona.extra?.archived),
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
    });

    if (!persona) {
      logger.warn({ msg: "Persona not found for sync", personaId });
      return;
    }

    logger.info({ msg: "Persona fetched from database", personaId, createdAt: persona.createdAt });

    const document = personaToDocument({ persona, userId: persona.userId, teamId: persona.teamId });
    // logger.info({ msg: "Persona converted to document", personaId, document });

    const index = meilisearchClient.index(INDEXES.PERSONAS);
    const task = index.addDocuments([document]);

    logger.info({ msg: "Document added to Meilisearch, waiting for task", personaId });
    const result = await task.waitTask({ timeout: 5000 }).catch(() => {
      // 超时没事，meili 后台只是在等待，这里 warn 一下继续即可
      logger.warn({ msg: "Failed to wait for task", personaId });
    });
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

// ============================================================
// Projects — study, universal, interview, panel
// ============================================================

/**
 * 将 study UserChat 转换为 Project 文档
 */
export function studyUserChatToDocument(userChat: UserChat): ProjectDocument {
  const context = userChat.context as UserChatContext | undefined;
  return {
    slug: `study-${userChat.id}`,
    type: "study",
    title: userChat.title,
    description: context?.studyTopic || "",
    userId: userChat.userId,
    teamId: null,
    archived: Boolean(userChat.extra?.archived),
    createdAt: userChat.createdAt.getTime(),
  };
}

/**
 * 将 universal UserChat 转换为 Project 文档
 */
export function universalUserChatToDocument(userChat: UserChat): ProjectDocument {
  return {
    slug: `universal-${userChat.id}`,
    type: "universal",
    title: userChat.title,
    description: "",
    userId: userChat.userId,
    teamId: null,
    archived: Boolean(userChat.extra?.archived),
    createdAt: userChat.createdAt.getTime(),
  };
}

/**
 * 将 InterviewProject 转换为 Project 文档
 */
export function interviewProjectToDocument(project: InterviewProject): ProjectDocument {
  return {
    slug: `interview-${project.id}`,
    type: "interview",
    title: "",
    description: project.brief,
    userId: project.userId,
    teamId: null,
    archived: Boolean(project.extra?.archived),
    createdAt: project.createdAt.getTime(),
  };
}

/**
 * 将 PersonaPanel 转换为 Project 文档
 */
export function personaPanelToDocument(panel: PersonaPanel): ProjectDocument {
  return {
    slug: `panel-${panel.id}`,
    type: "panel",
    title: panel.title,
    description: panel.instruction,
    userId: panel.userId,
    teamId: panel.teamId,
    archived: Boolean(panel.extra?.archived),
    createdAt: panel.createdAt.getTime(),
  };
}

/**
 * 同步单个 Project 到 Meilisearch
 */
export async function syncProject({ type, id }: { type: ProjectType; id: number }): Promise<void> {
  try {
    logger.info({ msg: "Starting project sync", type, id });

    let document: ProjectDocument | null = null;

    if (type === "study" || type === "universal") {
      const userChat = await prismaRO.userChat.findUnique({ where: { id } });
      if (!userChat) {
        logger.warn({ msg: "UserChat not found for project sync", type, id });
        return;
      }
      document =
        type === "study"
          ? studyUserChatToDocument(userChat)
          : universalUserChatToDocument(userChat);
    } else if (type === "interview") {
      const project = await prismaRO.interviewProject.findUnique({ where: { id } });
      if (!project) {
        logger.warn({ msg: "InterviewProject not found for project sync", id });
        return;
      }
      document = interviewProjectToDocument(project);
    } else if (type === "panel") {
      const panel = await prismaRO.personaPanel.findUnique({ where: { id } });
      if (!panel) {
        logger.warn({ msg: "PersonaPanel not found for project sync", id });
        return;
      }
      document = personaPanelToDocument(panel);
    }

    if (!document) return;

    const index = meilisearchClient.index(INDEXES.PROJECTS);
    const task = index.addDocuments([document]);

    logger.info({ msg: "Project document added to Meilisearch", type, id });
    await task.waitTask({ timeout: 5000 }).catch(() => {
      logger.warn({ msg: "Failed to wait for project sync task", type, id });
    });
    logger.info({ msg: "Project sync completed", type, id });
  } catch (error) {
    logger.error({
      msg: "Failed to sync project",
      type,
      id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * 从 Meilisearch 删除 Project
 */
export async function deleteProject({
  type,
  id,
}: {
  type: ProjectType;
  id: number;
}): Promise<void> {
  try {
    const slug = `${type}-${id}`;
    const index = meilisearchClient.index(INDEXES.PROJECTS);

    await index.deleteDocument(slug);
    logger.info({ msg: "Project deleted from search", type, id, slug });
  } catch (error) {
    logger.error({
      msg: "Failed to delete project",
      type,
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
