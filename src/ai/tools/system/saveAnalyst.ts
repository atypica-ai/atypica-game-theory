import { PlainTextToolResult } from "@/ai/tools";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { z } from "zod";

export interface SaveAnalystToolResult extends PlainTextToolResult {
  analystId: number;
  plainText: string;
}

export const saveAnalystTool = ({
  userId,
  studyUserChatId,
}: {
  userId: number;
  studyUserChatId: number;
}) =>
  tool({
    description: "保存研究主题",
    parameters: z.object({
      role: z.string().describe("研究者的角色"),
      topic: z
        .string()
        .describe("研究主题的描述，应当完整，详细，确保后续研究有明确方向")
        .transform(fixMalformedUnicodeString),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ role, topic }): Promise<SaveAnalystToolResult> => {
      const analystExisting = await prisma.analyst.findUnique({ where: { studyUserChatId } });
      if (analystExisting) {
        return {
          analystId: analystExisting.id,
          plainText: `本次研究的研究主题已保存过，返回现有主题 ID：${JSON.stringify({ analystId: analystExisting.id })}`,
        };
      }
      const analyst = await prisma.analyst.upsert({
        where: { studyUserChatId },
        create: { role, topic, studySummary: "", studyUserChatId },
        update: {},
      });
      await prisma.userAnalyst.upsert({
        where: {
          userId_analystId: { userId, analystId: analyst.id },
        },
        create: { userId, analystId: analyst.id },
        update: {},
      });
      return {
        analystId: analyst.id,
        plainText: `研究主题保存成功：${JSON.stringify({ analystId: analyst.id })}`,
      };
    },
  });

export interface SaveAnalystStudySummaryToolResult extends PlainTextToolResult {
  analystId: number;
  plainText: string;
}

export const saveAnalystStudySummaryTool = () =>
  tool({
    description: "总结并保存研究过程",
    parameters: z.object({
      analystId: z.number().describe("研究主题的ID"),
      studySummary: z.string().describe("客观描述研究过程").transform(fixMalformedUnicodeString),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ analystId, studySummary }): Promise<SaveAnalystStudySummaryToolResult> => {
      const analyst = await prisma.analyst.update({
        where: { id: analystId },
        data: { studySummary },
      });
      return {
        analystId: analyst.id,
        plainText: `研究过程保存成功：${JSON.stringify({ analystId: analyst.id })}`,
      };
    },
  });
