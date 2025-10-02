import { socialPostSchema } from "@/ai/tools/social/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

// Input schema
export const twitterSearchInputSchema = z.object({
  keyword: z.string().describe("Search keywords").transform(fixMalformedUnicodeString),
});

// Output schema
export const twitterSearchOutputSchema = z.object({
  posts: z.array(socialPostSchema),
  plainText: z.string(),
});

export type TwitterSearchResult = z.infer<typeof twitterSearchOutputSchema>;
