import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

export const audienceCallInputSchema = z.object({
  background: z
    .string()
    .describe(
      "Current context, findings so far, and relevant background information to help the expert understand the situation",
    )
    .transform(fixMalformedUnicodeString),
  question: z
    .string()
    .describe("Specific question, problem, or topic that requires expert analysis and reasoning")
    .transform(fixMalformedUnicodeString),
  audienceSearchQueries: z
    .array(z.string()) // 英文比中文字符数多很多，这里不要加 .max(300)
    .min(2)
    .max(3)
    .describe(
      "Detailed descriptions of target user profiles to find. Each description should be specific and comprehensive, describing user characteristics, demographics, interests, behaviors, goals, and context. The more detailed and specific, the better the search results (provide 2-3 diverse detailed descriptions)",
    ),
});

export type AudienceCallToolInput = z.infer<typeof audienceCallInputSchema>;

export const audienceCallOutputSchema = z.object({
  reasoning: z.string(),
  text: z.string(),
  plainText: z.string(),
});

export type AudienceCallResult = z.infer<typeof audienceCallOutputSchema>;
