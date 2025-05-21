import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { z } from "zod";
import { ThanksResult } from "./types";

export const thanksTool = tool({
  description: "感谢用户",
  parameters: z.object({
    name: z.string().describe("用户姓名"),
    company: z.string().describe("企业名称"),
    title: z.string().describe("职位名称"),
    contact: z.string().describe("联系方式"),
  }),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async (): Promise<ThanksResult> => {
    return { plainText: "Saved" };
  },
});
