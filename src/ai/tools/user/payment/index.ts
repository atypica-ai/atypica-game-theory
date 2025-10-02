import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import {
  requestPaymentInputSchema,
  requestPaymentOutputSchema,
} from "./types";

export const requestPaymentTool = tool({
  description:
    "Request user to purchase additional tokens when research quota is exhausted to continue the study workflow",
  inputSchema: requestPaymentInputSchema,
  outputSchema: requestPaymentOutputSchema,
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text", value: result.plainText };
  },
});
