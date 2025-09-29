import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { generateChatTitle } from "@/lib/userChat/lib";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { tool } from "ai";
import { z } from "zod";
import { SaveAnalystToolResult } from "./types";

export const saveAnalystTool = ({
  studyUserChatId,
  productRnD,
}: {
  studyUserChatId: number;
  productRnD?: boolean;
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
      kind: productRnD
        ? z
            .enum(["productRnD"])
            .describe("This value is fixed to 'productRnD'")
            .transform(() => "productRnD")
        : z
            .enum(["testing", "planning", "insights", "creation", "misc"])
            .describe(
              "Study type: 'testing' for comparing options, validating hypotheses, measuring effectiveness, and testing user reactions or preferences; 'insights' for understanding current situations, discovering problems, and analyzing behaviors; 'creation' for generating new ideas, designing innovative solutions, and creative exploration; 'planning' for developing frameworks, designing solution architectures, and creating structured implementation plans; 'misc' for general study that doesn't fit the other categories",
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
      // save analyst 以后，有了足够的信息，这时候可以生成一下 chat title
      waitUntil(generateChatTitle(studyUserChatId));
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
      "Save an objective summary of the completed study methodology and process workflow for report generation",
    parameters: z.object({
      studySummary: z
        .string()
        .describe(
          "Objective documentation of study design, methodology steps, data collection process, and workflow execution (exclude conclusions or findings). Valuable findings from websearch results according to study plan should be summarized and included.",
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
      // save summary 以后，有了更多的信息，这时候可以更新一下 chat title
      waitUntil(generateChatTitle(studyUserChatId));
      return {
        // analystId,
        plainText: `Study summary saved successfully for analyst ${analystId}`,
      };
    },
  });

export const saveInnovationSummaryTool = ({ studyUserChatId }: { studyUserChatId: number }) =>
  tool({
    description:
      "Save an objective summary of the completed study methodology and process workflow for report generation",
    parameters: z.object({
      studySummary: z
        .string()
        .describe(
          "Comprehensively and thoroughly save the complete innovation research process, providing as detailed and comprehensive information as possible: original product key information, innovative product solutions, innovation sources and processes, consumer demand insights, target customer profiles, demand gap analysis, competitive analysis of original products, innovation solution uniqueness validation, and user feedback citations",
        )
        .transform(fixMalformedUnicodeString),
      searchLog: z
        .string()
        .describe(
          "I'd like to include a dedicated section in the report that explains the entire innovation process logic. This will help readers better connect with the solution and be convinced by it. The section should include four parts: ## Innovation Process Logic ### 1. Starting Point Describe in one sentence what product the user wants to innovate and what type of innovation it is. ### 2. Search Strategy Describe in one sentence what inspiration search strategy the final solution is based on. ### 3. Inspiration Describe in one sentence what the final inspiration point or reference product is, and why this inspiration point was chosen. ### 4. Innovation Present the formula: 'Original Product + Inspiration Point = Final Innovation Product' This structure will provide readers with a clear understanding of how we arrived at the innovative solution, making the proposal more compelling and easier to follow. In MD format, no emojis.",
        )
        .transform(fixMalformedUnicodeString),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ studySummary, searchLog }): Promise<SaveAnalystStudySummaryToolResult> => {
      const { analyst } = await prisma.userChat.findUniqueOrThrow({
        where: { id: studyUserChatId, kind: "study" },
        select: { analyst: { select: { id: true } } },
      });
      if (!analyst) {
        throw new Error("Something went wrong, analyst does not exist on studyUserChat");
      }
      const analystId = analyst.id;

      const studySummaryWithSearchLog = `${studySummary}\n\n## Innovation Reasoning Process:\n${searchLog}`;
      await prisma.analyst.update({
        where: { id: analystId },
        data: { studySummary: studySummaryWithSearchLog },
      });
      return {
        // analystId,
        plainText: `Study summary saved successfully for analyst ${analystId}`,
      };
    },
  });
