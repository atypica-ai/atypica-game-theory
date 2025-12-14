"use server";
import { extractSageKnowledgeAction } from "@/app/(sage)/actions";
import { createSageInputSchema, type SageSourceContent } from "@/app/(sage)/types";
import { rootLogger } from "@/lib/logging";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { createUserChat } from "@/lib/userChat/lib";
import { generateToken } from "@/lib/utils";
import type { Sage, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { after } from "next/server";
import z from "zod";

/**
 * Create a new sage with initial content
 * No automatic processing - user must trigger manually
 */
export async function createSage(
  input: z.infer<typeof createSageInputSchema>,
): Promise<ServerActionResult<{ sage: Sage; userChat: UserChat }>> {
  return withAuth(async (user) => {
    const parseResult = createSageInputSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        message: "Malformed input",
      };
    }
    const validated = parseResult.data;
    const sage = await prisma.sage.create({
      data: {
        token: generateToken(),
        userId: user.id,
        name: validated.name,
        domain: validated.domain,
        locale: validated.locale,
        expertise: [],
        bio: "",
        extra: {},
        // Create sources
        sources: {
          create: validated.sources.map((source) => ({
            content: source,
            title: "",
            extractedText: "",
          })),
        },
      },
    });

    rootLogger.info({
      msg: "Created sage with sources",
      sageId: sage.id,
      userId: user.id,
      sourcesCount: validated.sources.length,
    });

    // Create a UserChat for management/viewing
    const userChat = await createUserChat({
      userId: user.id,
      kind: "misc",
      title: `Sage: ${validated.name}`,
    });

    after(() => extractSageKnowledgeAction(sage.id));

    return {
      success: true,
      data: { sage, userChat },
    };
  });
}

/**
 * List user's sages
 */
export async function listMySages(): Promise<
  ServerActionResult<Array<Sage & { _count: { chats: number; interviews: number } }>>
> {
  return withAuth(async (user) => {
    try {
      const sages = await prisma.sage.findMany({
        where: { userId: user.id },
        include: {
          _count: {
            select: {
              chats: true,
              interviews: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return {
        success: true,
        data: sages,
      };
    } catch (error) {
      rootLogger.error(`Failed to list sages: ${error}`);
      return {
        success: false,
        message: "Failed to list sages",
        code: "internal_server_error",
      };
    }
  });
}

/**
 * Add sources to an existing sage
 * Max 30 sources per sage
 */
export async function addSageSources(
  sageId: number,
  sources: SageSourceContent[],
): Promise<ServerActionResult<{ addedCount: number }>> {
  return withAuth(async (user) => {
    if (sources.length === 0) {
      return {
        success: false,
        message: "No sources provided",
      };
    }

    // Check ownership and current source count
    const sage = await prisma.sage.findUniqueOrThrow({
      where: { id: sageId, userId: user.id },
      include: {
        _count: {
          select: { sources: true },
        },
      },
    });

    const currentCount = sage._count.sources;
    const maxSources = 30;

    if (currentCount >= maxSources) {
      return {
        success: false,
        message: "Maximum sources limit reached (30)",
      };
    }

    if (currentCount + sources.length > maxSources) {
      return {
        success: false,
        message: `Can only add ${maxSources - currentCount} more sources`,
      };
    }

    // Add sources
    await prisma.sageSource.createMany({
      data: sources.map((source) => ({
        sageId: sageId,
        content: source,
        title: "",
        extractedText: "",
      })),
    });

    rootLogger.info({
      msg: "Added sources to sage",
      sageId,
      userId: user.id,
      addedCount: sources.length,
      totalCount: currentCount + sources.length,
    });

    return {
      success: true,
      data: { addedCount: sources.length },
    };
  });
}

/**
 * Delete sources from a sage
 * Support batch deletion by accepting array of IDs
 */
export async function deleteSageSources(
  sageId: number,
  sourceIds: number[],
): Promise<ServerActionResult<{ deletedCount: number }>> {
  return withAuth(async (user) => {
    if (sourceIds.length === 0) {
      return {
        success: false,
        message: "No source IDs provided",
      };
    }

    // Check ownership
    await prisma.sage.findUniqueOrThrow({
      where: { id: sageId, userId: user.id },
    });

    // Delete sources
    const result = await prisma.sageSource.deleteMany({
      where: {
        id: { in: sourceIds },
        sageId: sageId,
      },
    });

    rootLogger.info({
      msg: "Deleted sources from sage",
      sageId,
      userId: user.id,
      requestedCount: sourceIds.length,
      deletedCount: result.count,
    });

    return {
      success: true,
      data: { deletedCount: result.count },
    };
  });
}
