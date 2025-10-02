import { socialPostSchema, socialUserSchema } from "@/ai/tools/social/types";
import z from "zod/v3";

// Input schema
export const dyUserPostsInputSchema = z.object({
  secret_userid: z.string().describe("The secret user ID to fetch posts from"),
});

// Output schema
export const dyUserPostsOutputSchema = z.object({
  posts: z.array(
    socialPostSchema.extend({
      user: socialUserSchema.extend({
        secret_userid: z.string(),
      }),
    }),
  ),
  plainText: z.string(),
});

export type DYUserPostsResult = z.infer<typeof dyUserPostsOutputSchema>;
