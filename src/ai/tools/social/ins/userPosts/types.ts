import { socialPostSchema } from "@/ai/tools/social/types";
import z from "zod/v3";

// Input schema
export const insUserPostsInputSchema = z.object({
  userid: z.string().describe("The user ID to fetch posts from"),
});

// Output schema
export const insUserPostsOutputSchema = z.object({
  posts: z.array(
    socialPostSchema.extend({
      code: z.string(),
    }),
  ),
  plainText: z.string(),
});

export type InsUserPostsResult = z.infer<typeof insUserPostsOutputSchema>;
