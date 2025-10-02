import { fixMalformedUnicodeString } from "@/lib/utils";
import { z } from "zod/v3";

export const buildPersonaStreamObjectInputSchema = z.object({
  scoutUserChatToken: z
    .string()
    .describe(
      "Token from the completed user profile search task (scoutTaskChat). Must use the actual token from current research session - do not fabricate or reuse old tokens",
    ),
});

export const buildPersonaStreamObjectOutputSchema = z.object({
  personas: z.array(
    z.object({
      personaId: z.number(),
      name: z.string(),
      tags: z.array(z.string()),
      source: z.string(),
    }),
  ),
  plainText: z.string(),
});

export type BuildPersonaToolResult = z.infer<typeof buildPersonaStreamObjectOutputSchema>;

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
