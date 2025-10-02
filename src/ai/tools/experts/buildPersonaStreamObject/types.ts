import { PlainTextToolResult } from "@/ai/tools/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { z } from "zod/v3";

export interface BuildPersonaToolResult extends PlainTextToolResult {
  personas: {
    personaId: number;
    name: string;
    tags: string[];
    source: string;
  }[];
  plainText: string;
}

export const personaBuildSchemaStreamObject = () =>
  z.object({
    name: z
      .string()
      .describe("User persona display name or nickname (avoid using family names for privacy)")
      .transform(fixMalformedUnicodeString),
    source: z
      .string()
      .describe("Data source or platform where persona characteristics were observed")
      .transform(fixMalformedUnicodeString),
    // userids: z.array(z.string()).optional().describe("该人设典型的用户 ID 列表").default([]),
    tags: z
      .array(z.string())
      .describe(
        "3-5 characteristic tags that define this persona's key traits, interests, or demographics",
      )
      .transform((tags) => tags.map((tag) => fixMalformedUnicodeString(tag))),
    personaPrompt: z
      .string()
      .describe(
        "Comprehensive AI agent system prompt that enables realistic simulation of this persona's thinking patterns, decision-making, and communication style (300-500 words)",
      )
      .transform(fixMalformedUnicodeString),
  });
