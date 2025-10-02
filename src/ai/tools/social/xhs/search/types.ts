import { socialPostSchema } from "@/ai/tools/social/types";
import { fixMalformedUnicodeString } from "@/lib/utils";
import z from "zod/v3";

export const xhsSearchInputSchema = z.object({
  keyword: z.string().describe("Search keywords").transform(fixMalformedUnicodeString),
});

export const xhsSearchOutputSchema = z.object({
  notes: z.array(
    socialPostSchema.extend({
      title: z.string(),
      type: z.string(),
    }),
  ),
  plainText: z.string(),
});

export type XHSSearchResult = z.infer<typeof xhsSearchOutputSchema>;
