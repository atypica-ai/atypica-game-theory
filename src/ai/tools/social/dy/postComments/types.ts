import { socialPostCommentSchema, socialUserSchema } from "@/ai/tools/social/types";
import z from "zod/v3";

// Input schema
export const dyPostCommentsInputSchema = z.object({
  postid: z.string().describe("The post ID to fetch comments from"),
});

// Output schema
export const dyPostCommentsOutputSchema = z.object({
  comments: z.array(
    socialPostCommentSchema.extend({
      user: socialUserSchema.extend({
        secret_userid: z.string(),
      }),
    }),
  ),
  plainText: z.string(),
});

export type DYPostCommentsResult = z.infer<typeof dyPostCommentsOutputSchema>;
