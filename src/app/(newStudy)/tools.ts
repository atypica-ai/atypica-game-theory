import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { z } from "zod";

export const newStudyTools = {
  endInterview: tool({
    description: "End the planning session and generate the user's study brief",
    parameters: z.object({
      studyBrief: z
        .string()
        .describe(
          "A study brief written from the user's perspective, typically starting with '我...' (I...), describing their research needs, goals, and context. This brief will be passed to another agent for detailed research.",
        ),
    }),
    experimental_toToolResultContent: (result: PlainTextToolResult) => {
      return [{ type: "text", text: result.plainText }];
    },
    execute: async ({ studyBrief }) => {
      // 故意等10s，这样前端可以感觉到工具正在被执行。
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      return {
        studyBrief,
        plainText: "",
      };
    },
  }),
};
