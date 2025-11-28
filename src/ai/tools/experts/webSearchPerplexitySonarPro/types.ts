import z from "zod/v3";

export const webSearchPerplexitySonarProInputSchema = z.object({
  query: z.string().describe("The search query to find relevant information on the internet. Use concise and fluent language while including necessary background detail for optimized result. The question you are asking should not be biased, or asked with a set answer."),
});

export type WebSearchPerplexitySonarProToolInput = z.infer<typeof webSearchPerplexitySonarProInputSchema>;

export const webSearchPerplexitySonarProOutputSchema = z.object({
  answer: z.string(),
  plainText: z.string(),
});

export type WebSearchPerplexitySonarProToolResult = z.infer<typeof webSearchPerplexitySonarProOutputSchema>;

