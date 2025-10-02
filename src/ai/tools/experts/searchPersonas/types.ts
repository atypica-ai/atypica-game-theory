import { TPersonaForStudy } from "@/ai/tools/types";
import z from "zod/v3";

export const searchPersonasInputSchema = z.object({
  searchQueries: z
    .array(z.string()) // 英文比中文字符数多很多，这里不要加 .max(300)
    .min(2)
    .max(3)
    .describe(
      "Detailed descriptions of target user profiles to find. Each description should be specific and comprehensive, describing user characteristics, demographics, interests, behaviors, goals, and context. The more detailed and specific, the better the search results (provide 2-3 diverse detailed descriptions)",
    ),
  usePrivatePersonas: z
    .boolean()
    .default(false)
    .describe(
      "Set to true only when the user has explicitly chosen to prioritize using their private personas (真人画像) at the beginning of the study.",
    ),
});

export const searchPersonasOutputSchema = z.object({
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

export type SearchPersonasToolResult = z.infer<typeof searchPersonasOutputSchema>;
