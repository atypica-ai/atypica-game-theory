import "server-only";

import { rootLogger } from "@/lib/logging";
import { getMcpRequestContext } from "@/lib/mcp";
import { Prisma } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { searchPersonas as searchPersonasFromMeili } from "@/search/lib/queries";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const searchPersonasInputSchema = z.object({
  query: z.string().optional().describe("Search query for persona name or source"),
  privateOnly: z
    .boolean()
    .optional()
    .describe(
      "When true, only search user's own private personas. When omitted, search both public and user's private personas.",
    ),
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

    const { query, privateOnly, limit } = args;
    const userId = context.userId;

    let allPersonas: Array<{ personaId: number; name: string; source: string; tags: string[] }> =
      [];

    if (query) {
      // Full-text search with Meilisearch — single query handles public+private via filter
      const searchResults = await searchPersonasFromMeili({
        query,
        privateOnly: privateOnly || false,
        userId,
        pageSize: limit,
      });

      const personaIds = searchResults.hits
        .map((hit) => {
          const match = hit.slug.match(/^persona-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((id) => id > 0);

      const personas = await prismaRO.persona.findMany({
        where: { id: { in: personaIds } },
        select: { id: true, name: true, source: true, tags: true },
      });
      const personaMap = new Map(personas.map((p) => [p.id, p]));
      allPersonas = personaIds
        .map((id) => personaMap.get(id))
        .filter((p) => p !== undefined)
        .map((p) => ({
          personaId: p.id,
          name: p.name,
          source: p.source,
          tags: p.tags as string[],
        }));
    } else {
      // No query: fetch directly from DB
      let where: Prisma.PersonaWhereInput;

      if (privateOnly) {
        where = { userId, tier: { not: 0 } };
      } else {
        where = {
          OR: [{ userId: null }, { userId }],
          tier: { not: 0 },
        };
      }

      const personas = await prismaRO.persona.findMany({
        where,
        select: { id: true, name: true, source: true, tags: true },
        orderBy: { id: "desc" },
        take: limit,
      });
      allPersonas = personas.map((p) => ({
        personaId: p.id,
        name: p.name,
        source: p.source,
        tags: p.tags as string[],
      }));
    }

    // Get full persona details for result
    const personasWithDetails = await prismaRO.persona.findMany({
      where: { id: { in: allPersonas.map((p) => p.personaId) } },
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
