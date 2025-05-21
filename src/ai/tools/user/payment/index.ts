import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { z } from "zod";
// import { RequestPaymentResult } from "./types";

export const requestPaymentTool = tool({
  description: "提醒用户购买点数以继续对话",
  parameters: z.object({}),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
});
