import z from "zod/v3";

export const webFetchInputSchema = z.object({
  query: z.string().describe("Specific search query or website URL to fetch information from"),
});
export type WebFetchToolInput = z.infer<typeof webFetchInputSchema>;

export const webFetchOutputSchema = z.object({
  plainText: z.string(),
});
export type WebFetchToolResult = z.infer<typeof webFetchOutputSchema>;
