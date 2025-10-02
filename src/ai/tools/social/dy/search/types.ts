import { socialPostSchema, socialUserSchema } from "@/ai/tools/social/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

// Input schema
export const dySearchInputSchema = z.object({
  keyword: z.string().describe("Search keywords").transform(fixMalformedUnicodeString),
});

// Output schema
export const dySearchOutputSchema = z.object({
  posts: z.array(
    socialPostSchema.extend({
      user: socialUserSchema.extend({
        secret_userid: z.string(),
      }),
    }),
  ),
  plainText: z.string(),
});

export type DYSearchResult = z.infer<typeof dySearchOutputSchema>;
