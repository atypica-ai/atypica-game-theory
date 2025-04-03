import { PlainTextToolResult } from "@/tools/utils";
import { tool } from "ai";
import { z } from "zod";

export interface ThanksResult extends PlainTextToolResult {
  plainText: string;
}

export const thanksTool = tool({
  description: "感谢用户",
  parameters: z.object({}),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
});
