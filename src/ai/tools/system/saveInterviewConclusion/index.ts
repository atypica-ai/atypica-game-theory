import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { saveInterviewConclusionInputSchema, saveInterviewConclusionOutputSchema } from "./types";

export const saveInterviewConclusionTool = (interviewId: number) =>
  tool({
    description:
      "Save comprehensive interview summary and key insights to conclude the user interview session",
    inputSchema: saveInterviewConclusionInputSchema,
    outputSchema: saveInterviewConclusionOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
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
