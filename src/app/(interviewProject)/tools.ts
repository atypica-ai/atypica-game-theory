import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { z } from "zod";

export const interviewSessionTools = {
  endInterview: tool({
    description: "End the interview session and generate the interview summary",
    parameters: z.object({
      interviewSummary: z
        .string()
        .describe(
          "A summary of the interview, including key points, insights, participant responses, notable observations, and overall interview quality. This summary will be passed to another agent for analysis and feedback.",
        ),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ interviewSummary }) => {
      // 故意等10s，这样前端可以感觉到工具正在被执行。
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      return {
        interviewSummary,
        plainText: "",
      };
    },
  }),
};
