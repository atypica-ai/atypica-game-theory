import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import {
  requestInteractionInputSchema,
  requestInteractionOutputSchema,
} from "./types";

export const requestInteractionTool = tool({
  description:
    "Present multiple-choice questions to users for collecting specific feedback, preferences, or decisions during research workflow",
  inputSchema: requestInteractionInputSchema,
  outputSchema: requestInteractionOutputSchema,
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text", value: result.plainText };
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
