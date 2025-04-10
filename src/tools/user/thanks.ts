import { PlainTextToolResult } from "@/tools/utils";
import { tool } from "ai";
import { z } from "zod";

export interface ThanksResult extends PlainTextToolResult {
  plainText: string;
}

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
});
