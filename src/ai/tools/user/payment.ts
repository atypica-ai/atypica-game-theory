import { PlainTextToolResult } from "@/ai/tools";
import { tool } from "ai";
import { z } from "zod";

export interface RequestPaymentResult extends PlainTextToolResult {
  plainText: string;
}

export const requestPaymentTool = tool({
  description: "提醒用户购买点数以继续对话",
  parameters: z.object({}),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
});
