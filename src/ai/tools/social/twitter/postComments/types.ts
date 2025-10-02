import { socialPostCommentSchema } from "@/ai/tools/social/types";
import z from "zod/v3";

// Input schema
export const twitterPostCommentsInputSchema = z.object({
  tweetid: z.string().describe("The tweet ID to fetch comments from"),
});

// Output schema
export const twitterPostCommentsOutputSchema = z.object({
  comments: z.array(socialPostCommentSchema),
  plainText: z.string(),
});

export type TwitterPostCommentsResult = z.infer<typeof twitterPostCommentsOutputSchema>;
