"use server";
import { searchArtifacts } from "@/app/(search)/lib/queries";
import { ArtifactsSearchParams, ArtifactsSearchResult } from "@/app/(search)/types";
import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { ServerActionResult } from "@/lib/serverAction";

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
