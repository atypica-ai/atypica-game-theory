import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { prisma } from "@/prisma/prisma";
import { tool } from "ai";
import { z } from "zod";

export const interviewSessionTools = ({ interviewSessionId }: { interviewSessionId: number }) => ({
  endInterview: tool({
    description: "End the interview session and generate the interview summary and title",
    parameters: z.object({
      title: z
        .string()
        .describe(
          "A concise title for this interview session (maximum 20 words) that includes the interviewee's name and a one-sentence summary to help identify and find this interview later.",
        ),
      interviewSummary: z
        .string()
        .describe(
          "A summary of the interview, including key points, insights, participant responses, notable observations, and overall interview quality. This summary will be passed to another agent for analysis and feedback.",
        ),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ title, interviewSummary }) => {
      await Promise.all([
        // 故意等10s，这样前端可以感觉到工具正在被执行。
        new Promise((resolve) => setTimeout(resolve, 10_000)),
        prisma.interviewSession.update({
          where: { id: interviewSessionId },
          data: { title: (title ?? "").slice(0, 200) },
        }),
      ]);
      return {
        title,
        interviewSummary,
        plainText: "",
      };
    },
  }),
});
