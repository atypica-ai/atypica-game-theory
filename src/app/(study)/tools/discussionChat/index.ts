import "server-only";

import { AgentToolConfigArgs, PlainTextToolResult } from "@/ai/tools/types";
import { runPersonaDiscussion } from "@/app/(panel)/lib";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";

import { recordPersonaPanelContext } from "@/app/(study)/context/utils";
import {
  discussionChatInputSchema,
  discussionChatOutputSchema,
  type DiscussionChatResult,
} from "./types";

export const discussionChatTool = ({
  userId,
  userChatId,
  locale,
  abortSignal,
  statReport,
  logger,
}: {
  userId: number;
  userChatId: number;
} & AgentToolConfigArgs) =>
  tool({
    description:
      "Conduct a discussion with multiple personas. Discussion type (eg. Debate, Roundtable, Focus Group, etc.) will be customized based on user question, discussion purpose, core questions and other supporting information. Discussion result benefits from sufficient, lossless and detailed input information.",
    inputSchema: discussionChatInputSchema,
    outputSchema: discussionChatOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ panelId: inputPanelId, instruction, personaIds, timelineToken }): Promise<DiscussionChatResult> => {
      const discussionLogger = logger.child({ tool: "discussionChat", personaIds, timelineToken });

      try {
        let personaPanel;
        let resolvedPersonaIds = personaIds;
        if (inputPanelId) {
          personaPanel = await prisma.personaPanel.findUniqueOrThrow({
            where: { id: inputPanelId },
          }).catch(() => {
            throw new Error(`Panel ${inputPanelId} not found.`);
          });
          const allowedIds = new Set(personaPanel.personaIds);
          resolvedPersonaIds = personaIds.filter((id) => allowedIds.has(id));
          if (resolvedPersonaIds.length < 2) {
            return {
              panelId: personaPanel.id,
              timelineToken: "",
              plainText: "Not enough personas from the specified panel to run a discussion (minimum 2).",
            };
          }
        } else {
          personaPanel = await recordPersonaPanelContext({
            userId,
            userChatId,
            personaIds: resolvedPersonaIds,
          });
        }

        // Create DiscussionTimeline record first (with empty events) so frontend can start polling
        // Use the token provided from input schema (auto-generated)
        const discussionTimeline = await prisma.discussionTimeline.create({
          data: {
            personaPanelId: personaPanel.id,
            token: timelineToken,
            instruction,
            events: [],
            summary: "",
            minutes: "",
            extra: {},
          },
        });

        // Run panel discussion (automatically saves timeline events to database)
        const { summary } = await runPersonaDiscussion({
          instruction,
          personaPanel,
          discussionTimeline,
          locale,
          abortSignal,
          statReport,
          logger: discussionLogger,
        });

        const plainText =
          locale === "zh-CN"
            ? `讨论已完成。${resolvedPersonaIds.length}位参与者进行了讨论。\n\n讨论总结：\n${summary}`
            : `Discussion completed. ${resolvedPersonaIds.length} participants discussed.\n\nDiscussion Summary:\n${summary}`;

        return {
          panelId: personaPanel.id,
          timelineToken: discussionTimeline.token,
          plainText,
        };
      } catch (error) {
        discussionLogger.error(`Discussion failed: ${(error as Error).message}`);
        throw error;
      }
    },
  });
