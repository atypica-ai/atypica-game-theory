import { prisma } from "@/lib/prisma";
import { tool } from "ai";
import { z } from "zod";
import { PlainTextToolResult } from "../utils";

export const saveInterviewConclusionTool = (interviewId: number) =>
  tool({
    description: "将生成的结论保存到数据库",
    parameters: z.object({
      conclusion: z.string().describe("生成的结论"),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ conclusion }) => {
      await prisma.analystInterview.update({
        where: { id: interviewId },
        data: { conclusion },
      });
      return {
        id: interviewId,
        plainText: `Saved interview conclusion to DB with id ${interviewId}`,
      };
    },
  });
