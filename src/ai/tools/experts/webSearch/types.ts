import z from "zod/v3";

export const webSearchInputSchema = z.object({
  query: z.string().describe("The search query to find relevant information on the internet"),
});

export const webSearchOutputSchema = z.object({
  answer: z.string().optional(),
  results: z.array(
    z.object({
      url: z.string(),
      title: z.string(),
      content: z.string(),
    }),
  ),
  plainText: z.string(),
});

export type WebSearchToolResult = z.infer<typeof webSearchOutputSchema>;
