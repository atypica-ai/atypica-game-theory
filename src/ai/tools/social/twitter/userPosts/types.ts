import { socialPostSchema } from "@/ai/tools/social/types";
import { PlainTextToolResult, SocialPost } from "@/ai/tools/types";
import z from "zod/v3";

// Input schema
export const twitterUserPostsInputSchema = z.object({
  userid: z.string().describe("The user ID to fetch posts from"),
});

// Output schema
export const twitterUserPostsOutputSchema = z.object({
  posts: z.array(socialPostSchema),
  plainText: z.string(),
});

export type TwitterUserPostsResult = z.infer<typeof twitterUserPostsOutputSchema>;
