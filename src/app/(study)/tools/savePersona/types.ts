import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

export const savePersonaInputSchema = z.object({
  name: z
    .string()
    .describe(
      "User persona display name or nickname (avoid family names for privacy reasons), keep it under 5 words",
    )
    // .max(100) // 英文环境下，gemini 对这个 100 的理解不是 100 个字符，这里先去掉
    .transform(fixMalformedUnicodeString),
  source: z
    .string()
    .describe("Source or platform where persona characteristics were observed (10 words max)")
    // .max(100) // 英文环境下，gemini 对这个 100 的理解不是 100 个字符，这里先去掉
    .transform(fixMalformedUnicodeString),
  tags: z
    .array(z.string())
    .describe(
      "3-5 characteristic tags that define this persona's key traits, interests, or demographics",
    )
    .transform((tags) => tags.map((tag) => fixMalformedUnicodeString(tag))),
  // userids: z.array(z.string()).optional().describe("该人设典型的用户 ID 列表").default([]),
  personaPrompt: z
    .string()
    // .max(2000) // 英文环境下，gemini 对这个 100 的理解不是 100 个字符，这里先去掉
    .describe(
      "Comprehensive AI agent system prompt that enables realistic simulation of this persona's thinking patterns, decision-making, and communication style (recommended around 1000 ~ 2000 words)",
    )
    .transform(fixMalformedUnicodeString),
  locale: z
    .enum(["zh-CN", "en-US"])
    .optional()
    .describe(
      "Language used in the text parameters (name, personaPrompt, tags, etc.). Use 'zh-CN' for Chinese content, 'en-US' for English content. Do not provide a value if there is no matching option",
    ),
});

export const savePersonaOutputSchema = z.object({
  personaId: z.number(),
  plainText: z.string(),
});

export type SavePersonaToolResult = z.infer<typeof savePersonaOutputSchema>;
