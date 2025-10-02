import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { z } from "zod/v3";
// import { RequestPaymentResult } from "./types";

export const requestPaymentTool = tool({
  description:
    "Request user to purchase additional tokens when research quota is exhausted to continue the study workflow",
  inputSchema: z.object({}),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
});
