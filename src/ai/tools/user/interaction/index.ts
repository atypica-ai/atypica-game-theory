import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { z } from "zod";
// import { RequestInteractionResult } from "./types";

export const requestInteractionTool = tool({
  description:
    "Present multiple-choice questions to users for collecting specific feedback, preferences, or decisions during research workflow",
  parameters: z.object({
    question: z.string().describe("Clear question asking for user input, preference, or decision"),
    options: z
      .array(z.string())
      .describe(
        "2-4 distinct answer choices for the user to select from (users can select multiple options)",
      ),
  }),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  // 不实现 execute, 让前端通过 addToolResult 方法来回复，AI SDK 这个功能很好用
  // execute: async ({ question, options }) => {
  //   return {
  //     question,
  //     options,
  //     plainText: "等待用户输入或选择答案", // 这样让 llm 知道可以停下来
  //   };
  // },
});
