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
    description: "保存研究主题",
    parameters: z.object({
      role: z.string().describe("研究者的角色"),
      topic: z
        .string()
        .describe("研究主题，应包含所有背景和上下文，确保后续研究的信息完整")
        .transform(fixMalformedUnicodeString),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ role, topic }): Promise<SaveAnalystToolResult> => {
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
      //     plainText: `本次研究的研究主题已保存过，返回现有主题：${JSON.stringify({ analystId: analyst.id, topic: analyst.topic })}`,
      //   };
      // }
      await prisma.analyst.update({
        where: { id: analystId },
        data: { role, topic },
      });
      return {
        analystId: analyst.id,
        plainText: `研究主题${isUpdate ? "更新" : "保存"}成功：${JSON.stringify({ analystId: analyst.id })}`,
      };
    },
  });

export interface SaveAnalystStudySummaryToolResult extends PlainTextToolResult {
  // analystId: number;
  plainText: string;
}

export const saveAnalystStudySummaryTool = ({ studyUserChatId }: { studyUserChatId: number }) =>
  tool({
    description: "总结并保存研究过程",
    parameters: z.object({
      studySummary: z.string().describe("客观描述研究过程").transform(fixMalformedUnicodeString),
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
        plainText: `研究过程保存成功：${JSON.stringify({ analystId: analyst.id })}`,
      };
    },
  });
