"use server";

import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { ServerActionResult } from "@/lib/serverAction";
import { Prisma } from "@/prisma/client";
import { revalidatePath } from "next/cache";
import { initializeArtifactsIndex } from "./lib/client";
import { searchArtifacts } from "./lib/queries";
import { deleteArtifact, syncAllArtifacts, syncPodcast, syncReport } from "./lib/sync";
import { ArtifactsSearchParams, ArtifactsSearchResult, ArtifactType } from "./types";

/**
 * 搜索 Artifacts (Admin only)
 */
export async function searchArtifactsAction(
  params: ArtifactsSearchParams,
): Promise<ServerActionResult<ArtifactsSearchResult>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  try {
    const results = await searchArtifacts(params);
    return {
      success: true,
      data: results,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Search failed",
      code: "internal_server_error",
    };
  }
}

/**
 * 初始化 Artifacts 索引 (Admin only)
 */
export async function initializeIndexAction(): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  try {
    await initializeArtifactsIndex();
    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to initialize index",
      code: "internal_server_error",
    };
  }
}

/**
 * 全量同步所有 Artifacts (Admin only)
 */
export async function syncAllArtifactsAction(options?: {
  reportFilter?: Prisma.AnalystReportWhereInput;
  podcastFilter?: Prisma.AnalystPodcastWhereInput;
  limit?: number;
}): Promise<ServerActionResult<{ reportsCount: number; podcastsCount: number }>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  try {
    const result = await syncAllArtifacts(options);
    revalidatePath("/admin/studies");
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sync artifacts",
      code: "internal_server_error",
    };
  }
}

/**
 * 同步单个 Report
 */
export async function syncReportAction(reportId: number): Promise<ServerActionResult<void>> {
  try {
    await syncReport(reportId);
    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sync report",
      code: "internal_server_error",
    };
  }
}

/**
 * 同步单个 Podcast
 */
export async function syncPodcastAction(podcastId: number): Promise<ServerActionResult<void>> {
  try {
    await syncPodcast(podcastId);
    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to sync podcast",
      code: "internal_server_error",
    };
  }
}

/**
 * 删除 Artifact
 */
export async function deleteArtifactAction(
  type: ArtifactType,
  id: number,
): Promise<ServerActionResult<void>> {
  try {
    await deleteArtifact(type, id);
    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete artifact",
      code: "internal_server_error",
    };
  }
}
