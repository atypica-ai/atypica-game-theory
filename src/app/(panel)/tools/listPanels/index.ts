import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { prismaRO } from "@/prisma/prisma";
import { tool } from "ai";
import { listPanelsInputSchema, listPanelsOutputSchema, ListPanelsToolOutput } from "./types";

export const listPanelsTool = ({ userId }: { userId: number }) =>
  tool({
    description:
      "List the current user's persona panels. " +
      "Use this before reusing an existing panel for research, checking what panels already exist, " +
      "or deciding whether to create a new panel. Returns panel IDs, persona IDs, persona names, usage stats, and links.",
    inputSchema: listPanelsInputSchema,
    outputSchema: listPanelsOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text" as const, value: result.plainText };
    },
    execute: async ({ searchQuery, limit = 10 }): Promise<ListPanelsToolOutput> => {
      type SelectedPersona = {
        id: number;
        name: string;
        tags: string[];
      };

      const trimmedQuery = searchQuery?.trim();
      const panels = await prismaRO.personaPanel.findMany({
        where: {
          userId,
          ...(trimmedQuery
            ? {
                title: {
                  contains: trimmedQuery,
                  mode: "insensitive",
                },
              }
            : {}),
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
          _count: {
            select: {
              discussionTimelines: true,
              analystInterviews: true,
            },
          },
        },
      });

      const uniquePersonaIds = [...new Set(panels.flatMap((panel) => panel.personaIds))];
      const personas = await prismaRO.persona.findMany({
        where: { id: { in: uniquePersonaIds } },
        select: {
          id: true,
          name: true,
          tags: true,
        },
      });
      const personaMap = new Map(personas.map((persona) => [persona.id, persona]));

      const resultPanels = panels.map((panel) => {
        const panelPersonas = panel.personaIds
          .map((personaId) => personaMap.get(personaId))
          .filter((persona): persona is SelectedPersona => persona !== undefined)
          .map((persona) => ({
            id: persona.id,
            name: persona.name,
            tags: persona.tags,
          }));

        return {
          panelId: panel.id,
          title: panel.title || `Panel #${panel.id}`,
          instruction: panel.instruction,
          personaIds: panel.personaIds,
          personaCount: panel.personaIds.length,
          personas: panelPersonas,
          usageCount: {
            discussions: panel._count.discussionTimelines,
            interviews: panel._count.analystInterviews,
          },
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
                  `- [${panel.panelId}] ${panel.title}: ${panel.personaCount} personas, ` +
                  `${panel.usageCount.discussions} discussions, ${panel.usageCount.interviews} interviews, ` +
                  `link ${panel.link}`,
              ),
            ].join("\n");

      return {
        panels: resultPanels,
        plainText,
      };
    },
  });
