import { socialPostSchema, socialUserSchema } from "@/ai/tools/social/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

// Input schema
export const tiktokSearchInputSchema = z.object({
  keyword: z.string().describe("Search keywords").transform(fixMalformedUnicodeString),
});

// Output schema
export const tiktokSearchOutputSchema = z.object({
  posts: z.array(
    socialPostSchema.extend({
      user: socialUserSchema.extend({
        secret_userid: z.string(),
      }),
    }),
  ),
  plainText: z.string(),
});

export type TikTokSearchResult = z.infer<typeof tiktokSearchOutputSchema>;
