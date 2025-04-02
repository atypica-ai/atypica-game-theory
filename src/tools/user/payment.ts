import { PlainTextToolResult } from "@/tools/utils";
import { tool } from "ai";
import { z } from "zod";

export interface RequestPaymentResult extends PlainTextToolResult {
  paymentRecord: {
    orderNo: string;
    amount: number;
    description: string;
  };
  plainText: string;
}

export const requestPaymentTool = tool({
  description: "提醒用户购买点数以继续对话",
  parameters: z.object({}),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
});
