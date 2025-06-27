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
      "Save comprehensive study topic definition and expert analyst role configuration for the study. This is a FOUNDATIONAL tool that establishes the complete study context - all subsequent study activities depend on the completeness and quality of information saved here. MUST include all background information, webSearch findings, and contextual details.",
    parameters: z.object({
      role: z
        .string()
        .describe(
          "The expert analyst's professional role, specialization, or domain of expertise (maximum 5 words)",
        ),
      topic: z
        .string()
        .describe(
          "Comprehensive and detailed study topic description that MUST include: 1) Complete background context and problem description provided by the study initiator; 2) All relevant industry information, market trends, concepts, and data obtained through webSearch (even if not directly mentioned in conversations, integrate all webSearch findings into the topic); 3) Specific study objectives and goals; 4) Target audience and user groups; 5) Key study questions and hypotheses to be tested; 6) Any constraints, requirements, or scope limitations; 7) Expected outcomes and deliverables. Format as a well-structured, comprehensive description that provides complete context for all subsequent study activities. This topic will serve as the foundation for the entire study, so include ALL available information and context.",
        )
        .transform(fixMalformedUnicodeString),
      kind: z
        .enum(["testing", "planning", "insights", "creation", "productRnD", "misc"])
        .describe(
          "Study type: 'testing' for comparing options, validating hypotheses, measuring effectiveness, and testing user reactions or preferences; 'insights' for understanding current situations, discovering problems, and analyzing behaviors; 'creation' for generating new ideas, designing innovative solutions, and creative exploration; 'planning' for developing frameworks, designing solution architectures, and creating structured implementation plans; 'productRnD' for product research and development studies focused on technical feasibility, product design, feature development, and innovation exploration; 'misc' for general study that doesn't fit the other categories",
        ),
      locale: z
        .enum(["zh-CN", "en-US", "misc"])
        .describe(
          "Language used in the text parameters (role, topic, etc.). Use 'zh-CN' for Chinese content, 'en-US' for English content, 'misc' for unclear or mixed languages that cannot be clearly determined.",
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
              kind: true,
            },
          },
        },
      });
      if (!analyst) {
        throw new Error("Something went wrong, analyst does not exist on studyUserChat");
      }
      if (analyst.kind && analyst.kind !== analystKind) {
        return {
          analystId: analyst.id,
          plainText: `Analyst kind has already been determined and cannot be changed. You can only update the topic or role.`,
        };
      }
      const analystId = analyst.id;
      const isUpdate = !!analyst.topic;
      // if (analyst.topic) {
      //   return {
      //     analystId,
      //     plainText: `Study topic already exists, returning existing topic: ${JSON.stringify({ analystId: analyst.id, topic: analyst.topic })}`,
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

export const saveAnalystStudySummaryTool = ({
  studyUserChatId,
  summaryInstruction,
}: {
  studyUserChatId: number;
  summaryInstruction?: string;
}) =>
  tool({
    description:
      "Save an objective summary of the completed study methodology and process workflow for report generation",
    parameters: z.object({
      studySummary: z
        .string()
        .describe(
          summaryInstruction ||
            "Objective documentation of study design, methodology steps, data collection process, and workflow execution (exclude conclusions or findings)",
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
