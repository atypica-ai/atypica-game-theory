import { socialPostSchema } from "@/ai/tools/social/types";
import z from "zod/v3";

export const xhsUserNotesInputSchema = z.object({
  userid: z.string().describe("User ID on Xiaohongshu platform"),
});

export const xhsUserNotesOutputSchema = z.object({
  notes: z.array(
    socialPostSchema.extend({
      title: z.string(),
      type: z.string(),
    }),
  ),
  plainText: z.string(),
});

export type XHSUserNotesResult = z.infer<typeof xhsUserNotesOutputSchema>;
