import "server-only";

import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { recordPersonaPanelContext } from "@/app/(study)/context/utils";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import {
  updatePanelInputSchema,
  updatePanelOutputSchema,
  UpdatePanelToolOutput,
} from "./types";

/**
 * updatePanel — server-side tool that merges persona IDs into a panel.
 * Looks up the existing panel from UserChat context via recordPersonaPanelContext.
 */
export const updatePanelTool = ({
  userId,
  userChatId,
  logger,
}: AgentToolConfigArgs & {
  userId: number;
  userChatId: number;
}) =>
  tool({
    description:
      "Update the persona panel with the given persona IDs. " +
      "This merges (appends) new personas into the panel's existing list. Always call this after requestSelectPersonas to save the user's selection. " +
      "Can also be called to update the panel title.",
    inputSchema: updatePanelInputSchema,
    outputSchema: updatePanelOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text" as const, value: result.plainText };
    },
    execute: async ({ personaIds, title }): Promise<UpdatePanelToolOutput> => {
      const panel = await recordPersonaPanelContext({
        userId,
        userChatId,
        personaIds,
      });

      // Merge new personaIds with existing ones (deduplicated)
      const mergedIds = [...new Set([...panel.personaIds, ...personaIds])];

      const updated = await prisma.personaPanel.update({
        where: { id: panel.id },
        data: {
          personaIds: mergedIds,
          ...(title ? { title } : {}),
        },
      });

      logger.info({ msg: "Panel updated", panelId: updated.id, personaCount: mergedIds.length });

      return {
        panelId: updated.id,
        personaIds: mergedIds,
        title: updated.title || `Panel #${updated.id}`,
        plainText: `Panel "${updated.title}" updated with ${mergedIds.length} personas (panelId: ${updated.id}). Link: /panel/${updated.id}`,
      };
    },
  });
