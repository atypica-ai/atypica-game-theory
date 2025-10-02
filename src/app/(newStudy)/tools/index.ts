import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { endInterviewInputSchema, endInterviewOutputSchema } from "./types";

export const newStudyTools = {
  endInterview: tool({
    description: "End the planning session and generate the user's study brief",
    inputSchema: endInterviewInputSchema,
    outputSchema: endInterviewOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
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
