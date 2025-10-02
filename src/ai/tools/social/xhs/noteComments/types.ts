import { socialPostCommentSchema } from "@/ai/tools/social/types";
import z from "zod/v3";

export const xhsNoteCommentsInputSchema = z.object({
  noteid: z.string().describe("The note ID to fetch comments from"),
});

export const xhsNoteCommentsOutputSchema = z.object({
  comments: z.array(socialPostCommentSchema),
  plainText: z.string(),
});

export type XHSNoteCommentsResult = z.infer<typeof xhsNoteCommentsOutputSchema>;
