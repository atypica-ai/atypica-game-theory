import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { generatePersonaPanelTitle } from "@/app/(panel)/lib/persistence";
import { syncProject as syncProjectToMeili } from "@/search/lib/sync";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { after } from "next/server";
import type { Logger } from "pino";
import { createPanelInputSchema, createPanelOutputSchema, CreatePanelToolOutput } from "./types";

export const createPanelTool = ({
  userId,
  logger,
}: {
  userId: number;
  logger: Logger;
}) =>
  tool({
    description:
      "Create a new persona panel from a set of persona IDs. " +
      "Use this when the user explicitly wants to save a reusable panel instead of only running one research task.",
    inputSchema: createPanelInputSchema,
    outputSchema: createPanelOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text" as const, value: result.plainText };
    },
    execute: async ({ personaIds, title, instruction }): Promise<CreatePanelToolOutput> => {
      const cleanedPersonaIds = [...new Set(personaIds)];
      const cleanedTitle = title?.trim();
      const cleanedInstruction = instruction?.trim();

      const panel = await prisma.personaPanel.create({
        data: {
          userId,
          personaIds: cleanedPersonaIds,
          title: cleanedTitle ?? "",
          instruction: cleanedInstruction ?? "",
        },
      });

      after(
        (cleanedTitle
          ? syncProjectToMeili({ type: "panel", id: panel.id })
          : generatePersonaPanelTitle(panel.id).then(() => syncProjectToMeili({ type: "panel", id: panel.id }))
        ).catch((error) => {
          logger.error({
            msg: "Failed to finalize created panel",
            panelId: panel.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }),
      );

      const displayTitle = cleanedTitle || `Panel #${panel.id}`;
      logger.info({
        msg: "Panel created via universal tool",
        panelId: panel.id,
        personaCount: cleanedPersonaIds.length,
      });

      return {
        panelId: panel.id,
        title: displayTitle,
        personaIds: cleanedPersonaIds,
        link: `/panel/${panel.id}`,
        plainText: `Created panel "${displayTitle}" with ${cleanedPersonaIds.length} personas (panelId: ${panel.id}). Link: /panel/${panel.id}`,
      };
    },
  });
