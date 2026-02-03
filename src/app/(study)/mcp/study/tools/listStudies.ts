import "server-only";

import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { prisma } from "@/prisma/prisma";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { z } from "zod";

export const listStudiesInputSchema = z.object({
  kind: z
    .enum(["testing", "insights", "creation", "planning", "misc", "productRnD", "fastInsight"])
    .optional()
    .describe("Filter by research type"),
  page: z.number().int().min(1).default(1).describe("Page number"),
  pageSize: z.number().int().min(1).max(100).default(20).describe("Items per page"),
});

export async function handleListStudies(
  args: z.infer<typeof listStudiesInputSchema>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<CallToolResult> {
  try {
    const context = getMcpRequestContext();
    if (!context?.userId) {
      throw new Error("Missing userId in request context");
    }

    const { kind, page, pageSize } = args;
    const userId = context.userId;

    const where = {
      userId,
      kind: "study" as const,
      analyst: kind ? { kind } : undefined,
    };

    const [totalCount, studies] = await Promise.all([
      prisma.userChat.count({ where }),
      prisma.userChat.findMany({
        where,
        select: {
          id: true,
          token: true,
          title: true,
          context: true,
          createdAt: true,
          updatedAt: true,
          analyst: {
            select: {
              kind: true,
              locale: true,
              topic: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data = studies.map((study) => {
      const ctx = study.context as { reportTokens?: string[]; podcastTokens?: string[] };
      return {
        studyId: study.id,
        token: study.token,
        title: study.title,
        kind: study.analyst?.kind || null,
        topic: study.analyst?.topic || "",
        hasReport: (ctx.reportTokens?.length ?? 0) > 0,
        hasPodcast: (ctx.podcastTokens?.length ?? 0) > 0,
        replayUrl: `https://atypica.ai/study/${study.token}/share?replay=1`,
        createdAt: study.createdAt.toISOString(),
        updatedAt: study.updatedAt.toISOString(),
      };
    });

    return {
      content: [{ type: "text", text: `Found ${totalCount} studies (showing ${data.length})` }],
      structuredContent: {
        data,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: "Failed to list studies", error: errorMessage });
    return {
      content: [{ type: "text", text: `Error listing studies: ${errorMessage}` }],
      isError: true,
    };
  }
}
