import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { prismaRO } from "@/prisma/prisma";
import { searchProjects as searchProjectsFromMeili } from "@/search/lib/queries";
import { tool } from "ai";
import { listPanelsInputSchema, listPanelsOutputSchema, ListPanelsToolOutput } from "./types";

const PANEL_SLUG_PREFIX = "panel-";

function extractPanelId(slug: string): number | null {
  if (!slug.startsWith(PANEL_SLUG_PREFIX)) return null;
  const id = Number(slug.slice(PANEL_SLUG_PREFIX.length));
  return Number.isFinite(id) ? id : null;
}

export const listPanelsTool = ({ userId }: { userId: number }) =>
  tool({
    description:
      "List the current user's persona panels. " +
      "Use this before reusing an existing panel for research, checking what panels already exist, " +
      "or deciding whether to create a new panel. Returns panel IDs, persona details (name, tags, tier, extra), and links.",
    inputSchema: listPanelsInputSchema,
    outputSchema: listPanelsOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text" as const, value: result.plainText };
    },
    execute: async ({ searchQuery, limit = 10 }): Promise<ListPanelsToolOutput> => {
      const trimmedQuery = searchQuery?.trim();

      let panelIds: number[] | null = null;

      // When searching, try Meilisearch first for relevance-ranked results.
      if (trimmedQuery) {
        try {
          const searchResults = await searchProjectsFromMeili({
            query: trimmedQuery,
            type: "panel",
            userId,
            pageSize: limit,
          });
          if (searchResults.hits.length > 0) {
            panelIds = searchResults.hits
              .map((hit) => extractPanelId(hit.slug))
              .filter((id): id is number => id !== null);
          }
        } catch {
          // Meilisearch unavailable — fall through to DB query
        }
      }

      const panels = panelIds
        ? await prismaRO.personaPanel.findMany({
            where: { id: { in: panelIds }, userId },
            select: {
              id: true,
              title: true,
              instruction: true,
              personaIds: true,
              createdAt: true,
              updatedAt: true,
            },
          })
        : await prismaRO.personaPanel.findMany({
            where: {
              userId,
              ...(trimmedQuery ? { title: { contains: trimmedQuery, mode: "insensitive" } } : {}),
            },
            orderBy: { updatedAt: "desc" },
            take: limit,
            select: {
              id: true,
              title: true,
              instruction: true,
              personaIds: true,
              createdAt: true,
              updatedAt: true,
            },
          });

      // Maintain Meilisearch relevance order when search was used.
      const orderedPanels = panelIds
        ? (() => {
            const byId = new Map(panels.map((p) => [p.id, p]));
            return panelIds
              .map((id) => byId.get(id))
              .filter(<T>(v: T): v is NonNullable<T> => v != null);
          })()
        : panels;

      // Batch-fetch persona details.
      const uniquePersonaIds = [...new Set(orderedPanels.flatMap((p) => p.personaIds))];
      const personas = await prismaRO.persona.findMany({
        where: { id: { in: uniquePersonaIds } },
        select: {
          id: true,
          name: true,
          tags: true,
          tier: true,
        },
      });
      const personaMap = new Map(personas.map((p) => [p.id, p]));

      const resultPanels = orderedPanels.map((panel) => {
        const panelPersonas = panel.personaIds
          .map((pid) => personaMap.get(pid))
          .filter(<T>(v: T): v is NonNullable<T> => v != null)
          .map((p) => ({
            id: p.id,
            name: p.name,
            tags: p.tags,
            tier: p.tier,
          }));

        return {
          panelId: panel.id,
          title: panel.title || `Panel #${panel.id}`,
          instruction: panel.instruction,
          personaIds: panel.personaIds,
          personaCount: panel.personaIds.length,
          personas: panelPersonas,
          createdAt: panel.createdAt.toISOString(),
          updatedAt: panel.updatedAt.toISOString(),
          link: `/panel/${panel.id}`,
        };
      });

      const plainText =
        resultPanels.length === 0
          ? trimmedQuery
            ? `No panels found matching "${trimmedQuery}".`
            : "No panels found."
          : [
              `Found ${resultPanels.length} panel(s).`,
              ...resultPanels.map(
                (panel) =>
                  `- [${panel.panelId}] ${panel.title}: ${panel.personaCount} personas, link ${panel.link}`,
              ),
            ].join("\n");

      return {
        panels: resultPanels,
        plainText,
      };
    },
  });
