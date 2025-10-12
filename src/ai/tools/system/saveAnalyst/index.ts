import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { generateChatTitle } from "@/lib/userChat/lib";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { tool } from "ai";
import {
  saveAnalystInputSchema,
  saveAnalystOutputSchema,
  saveAnalystStudySummaryInputSchema,
  saveAnalystStudySummaryOutputSchema,
  saveInnovationSummaryInputSchema,
  saveInnovationSummaryOutputSchema,
  type SaveAnalystStudySummaryToolResult,
  type SaveAnalystToolResult,
  type SaveInnovationSummaryToolResult,
} from "./types";

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
    inputSchema: saveAnalystInputSchema(productRnD),
    outputSchema: saveAnalystOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
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

export const saveAnalystStudySummaryTool = ({ studyUserChatId }: { studyUserChatId: number }) =>
  tool({
    description:
      "Save an objective summary of the completed study methodology and process workflow for report generation",
    inputSchema: saveAnalystStudySummaryInputSchema,
    outputSchema: saveAnalystStudySummaryOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
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
    inputSchema: saveInnovationSummaryInputSchema,
    outputSchema: saveInnovationSummaryOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ studySummary, searchLog }): Promise<SaveInnovationSummaryToolResult> => {
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
