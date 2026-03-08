import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { createPersonaPanel } from "@/app/(panel)/lib/persistence";
import { tool } from "ai";
import type { Logger } from "pino";
import { createPanelInputSchema, createPanelOutputSchema, CreatePanelToolOutput } from "./types";

export const createPanelTool = ({ userId, logger }: { userId: number; logger: Logger }) =>
  tool({
    description:
      "Create a new persona panel from a set of persona IDs. " +
      "Use this when the user explicitly wants to save a reusable panel instead of only running one research task.",
    inputSchema: createPanelInputSchema,
    outputSchema: createPanelOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text" as const, value: result.plainText };
    },
    execute: async ({ personaIds, instruction }): Promise<CreatePanelToolOutput> => {
      const cleanedPersonaIds = [...new Set(personaIds)];

      const panel = await createPersonaPanel({
        userId,
        personaIds: cleanedPersonaIds,
        instruction: instruction?.trim(),
      });

      logger.info({
        msg: "Panel created via universal tool",
        panelId: panel.id,
        personaCount: cleanedPersonaIds.length,
      });

      return {
        panelId: panel.id,
        plainText: `Created panel #${panel.id} with ${cleanedPersonaIds.length} personas.`,
      };
    },
  });
