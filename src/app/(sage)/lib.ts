import "server-only";

import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import type { WorkingMemoryItem } from "./types";

/**
 * Create or update sage memory document with layered memory support
 */
export async function createOrUpdateMemoryDocument({
  sageId,
  operation,
  coreMemory,
  workingMemory,
  changeNotes,
}: {
  sageId: number;
  operation:
    | "add_working"
    | "integrate_working"
    | "extract_from_sources"
    | "manual_edit_core";
  coreMemory?: string;
  workingMemory?: WorkingMemoryItem[];
  changeNotes: string;
}) {
  // Get latest version
  const latestDoc = await prisma.sageMemoryDocument.findFirst({
    where: { sageId },
    orderBy: { version: "desc" },
  });

  // Determine if should create new version
  const shouldUpdateVersion =
    operation === "integrate_working" ||
    operation === "extract_from_sources" ||
    operation === "manual_edit_core";

  if (!latestDoc) {
    // First creation, version 1
    const doc = await prisma.sageMemoryDocument.create({
      data: {
        sageId,
        version: 1,
        content: "", // DEPRECATED, always empty for new created memory document
        core: coreMemory || "",
        working: workingMemory || [],
        changeNotes,
      },
    });

    rootLogger.info({
      msg: "Created initial sage memory document",
      sageId,
      version: 1,
    });

    return doc;
  }

  if (shouldUpdateVersion) {
    // Create new version
    const newVersion = latestDoc.version + 1;
    const doc = await prisma.sageMemoryDocument.create({
      data: {
        sageId,
        version: newVersion,
        content: "", // DEPRECATED, always empty for new created memory document
        core: coreMemory || latestDoc.core,
        working: workingMemory || [], // Clear working memory after integration
        changeNotes,
      },
    });

    rootLogger.info({
      msg: "Created new sage memory document version",
      sageId,
      version: newVersion,
      operation,
    });

    return doc;
  } else {
    // Update current version (don't increment version number)
    const doc = await prisma.sageMemoryDocument.update({
      where: { id: latestDoc.id },
      data: {
        working: workingMemory,
        changeNotes: `${latestDoc.changeNotes}\n\n[Update] ${changeNotes}`,
        updatedAt: new Date(),
      },
    });

    rootLogger.info({
      msg: "Updated sage memory document without version change",
      sageId,
      version: latestDoc.version,
      operation,
    });

    return doc;
  }
}

/**
 * Add working memory item
 */
export async function addWorkingMemory({
  sageId,
  workingItem,
}: {
  sageId: number;
  workingItem: WorkingMemoryItem;
}) {
  const latestDoc = await prisma.sageMemoryDocument.findFirst({
    where: { sageId },
    orderBy: { version: "desc" },
  });

  if (!latestDoc) {
    throw new Error("No memory document found for sage");
  }

  const currentWorking = latestDoc.working as unknown as WorkingMemoryItem[];
  const updatedWorking = [...currentWorking, workingItem];

  return await createOrUpdateMemoryDocument({
    sageId,
    operation: "add_working",
    workingMemory: updatedWorking,
    changeNotes: `Added working memory from interview ${workingItem.sourceChat.token}`,
  });
}

/**
 * Integrate working memory items into core memory
 * This will use AI to merge pending working memory items into the core document
 */
export async function integrateWorkingMemoryToCore({
  sageId,
}: {
  sageId: number;
  locale?: string; // TODO: Will be used for AI integration in next phase
}): Promise<{
  success: boolean;
  integratedCount: number;
  newVersion: number;
}> {
  const latestDoc = await prisma.sageMemoryDocument.findFirst({
    where: { sageId },
    orderBy: { version: "desc" },
  });

  if (!latestDoc) {
    throw new Error("No memory document found for sage");
  }

  const { core, working } = {
    core: latestDoc.core,
    working: latestDoc.working as WorkingMemoryItem[],
  };
  const pendingItems = working.filter((item) => item.status === "pending");

  if (pendingItems.length === 0) {
    return {
      success: false,
      integratedCount: 0,
      newVersion: latestDoc.version,
    };
  }

  // Use AI to integrate - will be implemented in next step
  // For now, just mark items as integrated and create new version
  const updatedWorking = working.map((item) => ({
    ...item,
    status: item.status === "pending" ? ("integrated" as const) : item.status,
  }));

  const doc = await createOrUpdateMemoryDocument({
    sageId,
    operation: "integrate_working",
    coreMemory: core, // Will be updated by AI integration in next step
    workingMemory: updatedWorking,
    changeNotes: `Integrated ${pendingItems.length} working memory items`,
  });

  rootLogger.info({
    msg: "Integrated working memory to core",
    sageId,
    integratedCount: pendingItems.length,
    newVersion: doc.version,
  });

  return {
    success: true,
    integratedCount: pendingItems.length,
    newVersion: doc.version,
  };
}
