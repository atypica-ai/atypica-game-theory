import { socialPostCommentSchema } from "@/ai/tools/social/types";
import z from "zod/v3";

// Input schema
export const insPostCommentsInputSchema = z.object({
  postcode: z.string().describe("The post slug to fetch comments from"),
});

// Output schema
export const insPostCommentsOutputSchema = z.object({
  comments: z.array(socialPostCommentSchema),
  plainText: z.string(),
});

export type InsPostCommentsResult = z.infer<typeof insPostCommentsOutputSchema>;
