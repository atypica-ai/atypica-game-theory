import { socialPostSchema, socialUserSchema } from "@/ai/tools/social/types";
import z from "zod/v3";

// Input schema
export const tiktokUserPostsInputSchema = z.object({
  secret_userid: z.string().describe("The secret user ID to fetch posts from"),
});

// Output schema
export const tiktokUserPostsOutputSchema = z.object({
  posts: z.array(
    socialPostSchema.extend({
      user: socialUserSchema.extend({
        secret_userid: z.string(),
      }),
    }),
  ),
  plainText: z.string(),
});

export type TikTokUserPostsResult = z.infer<typeof tiktokUserPostsOutputSchema>;
