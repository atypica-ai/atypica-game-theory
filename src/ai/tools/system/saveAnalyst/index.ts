import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { z } from "zod";
import { SaveAnalystToolResult } from "./types";

export const saveAnalystTool = ({
  // userId,
  studyUserChatId,
}: {
  userId: number;
  studyUserChatId: number;
}) =>
  tool({
    description:
      "Save comprehensive research topic definition and expert analyst role configuration for the study",
    parameters: z.object({
      role: z
        .string()
        .describe(
          "The expert analyst's professional role, specialization, or domain of expertise (maximum 5 words)",
        ),
      topic: z
        .string()
        .describe(
          "Complete research topic description including background context, objectives, target audience, key questions, and any constraints or requirements for comprehensive analysis",
        )
        .transform(fixMalformedUnicodeString),
      kind: z
        .enum(["testing", "planning", "insights", "creation"])
        .describe(
          "Research type: 'testing' for evaluating and validating products, services, concepts, or strategies; 'insights' for discovering patterns, trends, user behaviors, and market understanding; 'creation' for innovative and creative work including product development, design concepts, artistic projects, and ideation; 'planning' for strategic planning, roadmaps, and decision-making frameworks",
        ),
      locale: z
        .enum(["zh-CN", "en-US"])
        .optional()
        .describe(
          "Language used in the text parameters (role, topic, etc.). Use 'zh-CN' for Chinese content, 'en-US' for English content. Do not provide a value if there is no matching option",
        ),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ role, topic, kind: analystKind, locale }): Promise<SaveAnalystToolResult> => {
      const { analyst } = await prisma.userChat.findUniqueOrThrow({
        where: { id: studyUserChatId, kind: "study" },
        select: {
          analyst: {
            select: {
              id: true,
              topic: true,
            },
          },
        },
      });
      if (!analyst) {
        throw new Error("Something went wrong, analyst does not exist on studyUserChat");
      }
      const analystId = analyst.id;
      const isUpdate = !!analyst.topic;
      // if (analyst.topic) {
      //   return {
      //     analystId,
      //     plainText: `Research topic already exists, returning existing topic: ${JSON.stringify({ analystId: analyst.id, topic: analyst.topic })}`,
      //   };
      // }
      await prisma.analyst.update({
        where: { id: analystId },
        data: {
          role: role.slice(0, 100), // 为了数据库不报错，防御性的截断一下
          topic,
          kind: analystKind,
          locale,
        },
      });
      return {
        analystId: analyst.id,
        plainText: `Study topic and analyst configuration ${isUpdate ? "updated" : "saved"} successfully with analystId: ${analyst.id}`,
      };
    },
  });

export interface SaveAnalystStudySummaryToolResult extends PlainTextToolResult {
  // analystId: number;
  plainText: string;
}

export const saveAnalystStudySummaryTool = ({ studyUserChatId }: { studyUserChatId: number }) =>
  tool({
    description:
      "Save an objective summary of the completed research methodology and process workflow for report generation",
    parameters: z.object({
      studySummary: z
        .string()
        .describe(
          "Objective documentation of research design, methodology steps, data collection process, and workflow execution (exclude conclusions or findings)",
        )
        .transform(fixMalformedUnicodeString),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ studySummary }): Promise<SaveAnalystStudySummaryToolResult> => {
      const { analyst } = await prisma.userChat.findUniqueOrThrow({
        where: { id: studyUserChatId, kind: "study" },
        select: { analyst: { select: { id: true } } },
      });
      if (!analyst) {
        throw new Error("Something went wrong, analyst does not exist on studyUserChat");
      }
      const analystId = analyst.id;
      await prisma.analyst.update({
        where: { id: analystId },
        data: { studySummary },
      });
      return {
        // analystId,
        plainText: `Study summary saved successfully for analyst ${analystId}`,
      };
    },
  });
