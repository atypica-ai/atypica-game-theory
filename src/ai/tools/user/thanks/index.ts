import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { thanksInputSchema, thanksOutputSchema, type ThanksResult } from "./types";

export const thanksTool = tool({
  description:
    "Collect user contact information and thank them for participating in the research consultation",
  inputSchema: thanksInputSchema,
  outputSchema: thanksOutputSchema,
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text", value: result.plainText };
  },
  execute: async (): Promise<ThanksResult> => {
    return {
      plainText:
        "Contact information saved successfully. Thank you for your interest in atypica.AI enterprise solutions.",
    };
  },
});
