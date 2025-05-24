import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { z } from "zod";

export const saveInterviewConclusionTool = (interviewId: number) =>
  tool({
    description:
      "Save comprehensive interview summary and key insights to conclude the user interview session",
    parameters: z.object({
      conclusion: z
        .string()
        .describe(
          "Detailed interview conclusion including key findings, user insights, behavioral patterns, and memorable quotes in markdown format",
        ),
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
        plainText: `Interview conclusion and insights saved successfully for interview ${interviewId}`,
      };
    },
  });
