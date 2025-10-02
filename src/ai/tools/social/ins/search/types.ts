import { socialPostSchema } from "@/ai/tools/social/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

// Input schema
export const insSearchInputSchema = z.object({
  keyword: z.string().describe("Search keywords").transform(fixMalformedUnicodeString),
});

// Output schema
export const insSearchOutputSchema = z.object({
  posts: z.array(
    socialPostSchema.extend({
      code: z.string(),
    }),
  ),
  plainText: z.string(),
});

export type InsSearchResult = z.infer<typeof insSearchOutputSchema>;
