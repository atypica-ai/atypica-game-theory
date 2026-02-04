import "server-only";

import { searchPersonasInTool } from "@/app/(study)/tools/searchPersonas";
import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { prismaRO } from "@/prisma/prisma";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { getLocale } from "next-intl/server";
import { z } from "zod";

export const searchPersonasInputSchema = z.object({
  query: z.string().optional().describe("Search query for persona name or source"),
  tier: z.number().int().min(0).max(3).optional().describe("Filter by persona tier (0-3)"),
  limit: z.number().int().min(1).max(50).default(10).describe("Max personas to return"),
});

export async function handleSearchPersonas(
  args: z.infer<typeof searchPersonasInputSchema>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): Promise<CallToolResult> {
  try {
    const context = getMcpRequestContext();
    if (!context?.userId) {
      throw new Error("Missing userId in request context");
    }

    const { query, tier, limit } = args;
    const userId = context.userId;
    const locale = await getLocale();

    const logger = rootLogger.child({
      mcp: "atypica-study-mcp",
      tool: "search_personas",
      userId,
    });

    // Use semantic search from study agent tool
    let allPersonas: Array<{ personaId: number; name: string; source: string; tags: string[] }> =
      [];

    if (query) {
      // Semantic search with embedding
      const result = await searchPersonasInTool({
        locale,
        searchQuery: query,
        logger,
        userId,
        usePrivatePersonas: true, // MCP always searches user's own personas
      });
      allPersonas = result.personas;
    } else {
      // No query: fetch all user's personas directly
      const personas = await prismaRO.persona.findMany({
        where: {
          personaImport: { userId },
          ...(tier !== undefined ? { tier } : {}),
        },
        select: {
          id: true,
          name: true,
          source: true,
          tags: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      allPersonas = personas.map((p) => ({
        personaId: p.id,
        name: p.name,
        source: p.source,
        tags: p.tags as string[],
      }));
    }

    // Apply tier filter if specified
    if (tier !== undefined) {
      const personasWithTier = await prismaRO.persona.findMany({
        where: {
          id: { in: allPersonas.map((p) => p.personaId) },
          tier,
        },
        select: {
          id: true,
          token: true,
          name: true,
          source: true,
          tier: true,
          tags: true,
          createdAt: true,
        },
      });
      const filtered = allPersonas
        .filter((p) => personasWithTier.some((pt) => pt.id === p.personaId))
        .slice(0, limit);

      return formatPersonasResult(filtered, personasWithTier);
    }

    // Get full persona details with tier for result
    const personasWithDetails = await prismaRO.persona.findMany({
      where: {
        id: { in: allPersonas.map((p) => p.personaId) },
      },
      select: {
        id: true,
        token: true,
        name: true,
        source: true,
        tier: true,
        tags: true,
        createdAt: true,
      },
    });

    const limited = allPersonas.slice(0, limit);
    return formatPersonasResult(limited, personasWithDetails);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    rootLogger.error({ msg: "Failed to search personas", error: errorMessage });
    return {
      content: [{ type: "text", text: `Error searching personas: ${errorMessage}` }],
      isError: true,
    };
  }
}

function formatPersonasResult(
  personas: Array<{ personaId: number; name: string; source: string; tags: string[] }>,
  fullDetails: Array<{
    id: number;
    token: string;
    name: string;
    source: string;
    tier: number;
    tags: unknown;
    createdAt: Date;
  }>,
): CallToolResult {
  const personasText = personas.map((p) => `${p.name} (${p.source})`).join("\n");

  return {
    content: [{ type: "text", text: personasText || "No personas found" }],
    structuredContent: {
      data: personas.map((persona) => {
        const detail = fullDetails.find((d) => d.id === persona.personaId);
        return {
          personaId: persona.personaId,
          token: detail?.token ?? "",
          name: persona.name,
          source: persona.source,
          tier: detail?.tier ?? 0,
          tags: persona.tags,
          createdAt: detail?.createdAt.toISOString() ?? "",
        };
      }),
    },
  };
}
