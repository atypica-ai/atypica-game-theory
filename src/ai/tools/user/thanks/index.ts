import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { z } from "zod/v3";
import { ThanksResult } from "./types";

export const thanksTool = tool({
  description:
    "Collect user contact information and thank them for participating in the research consultation",
  inputSchema: z.object({
    name: z.string().describe("User's full name for follow-up contact"),
    company: z.string().describe("Company or organization name"),
    title: z.string().describe("Professional job title or role"),
    contact: z.string().describe("Contact information (email or phone number for follow-up)"),
  }),
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async (): Promise<ThanksResult> => {
    return {
      plainText:
        "Contact information saved successfully. Thank you for your interest in atypica.AI enterprise solutions.",
    };
  },
});
